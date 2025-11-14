const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Milestone = require('../models/Milestone');
const User = require('../models/User');

let io;

function initChatSocket(server) {
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) return next(new Error('User not found'));

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`💬 Chat socket connected: ${socket.user.username}`);

    const chats = await Chat.find({ participants: socket.userId });
    chats.forEach(chat => socket.join(chat._id.toString()));

    socket.on('send_message', async (data) => {
      try {
        const { chatId, content, type, milestoneId } = data;
        if (!chatId || (!content && type !== 'milestone')) {
          return socket.emit('error', 'Missing required fields');
        }

        const chat = await Chat.findById(chatId);
        if (!chat) return socket.emit('error', 'Chat not found');
        if (!chat.participants.includes(socket.userId)) return socket.emit('error', 'Not authorized');

        const message = new Message({
          chat: chat._id,
          sender: socket.userId,
          content: content || '',
          type: type || 'text',
          milestone: milestoneId || undefined
        });

        await message.save();

        chat.lastMessage = message._id;
        chat.updatedAt = new Date();
        await chat.save();

        io.to(chat._id.toString()).emit('new_message', message);
      } catch (err) {
        console.error('Send message error:', err);
        socket.emit('error', 'Failed to send message');
      }
    });

    socket.on('create_milestone', async (data) => {
      try {
        const { chatId, title, description, price, dueDate } = data;
        const chat = await Chat.findById(chatId);
        if (!chat) return socket.emit('error', 'Chat not found');
        if (!chat.participants.includes(socket.userId)) return socket.emit('error', 'Not authorized');

        const milestone = await Milestone.create({
          proposal: chat.proposal,
          title,
          description,
          price,
          dueDate
        });

        const milestoneMessage = new Message({
          chat: chat._id,
          sender: socket.userId,
          type: 'milestone',
          milestone: milestone._id
        });

        await milestoneMessage.save();
        chat.lastMessage = milestoneMessage._id;
        chat.updatedAt = new Date();
        await chat.save();

        io.to(chat._id.toString()).emit('new_milestone', { milestone, message: milestoneMessage });
      } catch (err) {
        console.error('Create milestone error:', err);
        socket.emit('error', 'Failed to create milestone');
      }
    });

    socket.on('mark_read', async (chatId) => {
      try {
        await Message.updateMany(
          { chat: chatId, sender: { $ne: socket.userId }, read: false },
          { $set: { read: true } }
        );
        io.to(chatId).emit('messages_read', { chatId, userId: socket.userId });
      } catch (err) {
        socket.emit('error', 'Failed to mark messages as read');
      }
    });

    socket.on('typing', ({ chatId, isTyping }) => {
      socket.to(chatId).emit('typing', { userId: socket.userId, isTyping });
    });

    socket.on('disconnect', () => {
      console.log(`❌ Chat socket disconnected: ${socket.user.username}`);
    });
  });

  return io;
}

module.exports = { initChatSocket };
