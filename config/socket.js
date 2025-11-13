const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
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
        const { chatId, recipientId, text } = data;

        if (!text || (!chatId && !recipientId)) {
          return socket.emit('error', 'Missing required fields');
        }

        let chat;
        if (chatId) {
          chat = await Chat.findById(chatId);
          if (!chat) return socket.emit('error', 'Chat not found');
        } else {
          chat = await Chat.findOneAndUpdate(
            {
              participants: { $all: [socket.userId, recipientId] },
              type: 'private'
            },
            {
              $setOnInsert: { participants: [socket.userId, recipientId], type: 'private' }
            },
            { upsert: true, new: true }
          );
        }

        const message = new Message({
          chat: chat._id,
          sender: socket.userId,
          text: text.trim(),
        });

        await message.save();

        chat.lastMessage = message._id;
        chat.updatedAt = new Date();
        await chat.save();

        io.to(chat._id.toString()).emit('new_message', {
          _id: message._id,
          chat: chat._id,
          sender: socket.userId,
          text: message.text,
          createdAt: message.createdAt
        });

      } catch (err) {
        console.error('Send message error:', err);
        socket.emit('error', 'Failed to send message');
      }
    });

    socket.on('mark_read', async (chatId) => {
      try {
        await Message.updateMany(
          { chat: chatId, sender: { $ne: socket.userId }, read: false },
          { $set: { read: true, readAt: new Date() } }
        );

        io.to(chatId).emit('messages_read', { chatId, userId: socket.userId });
      } catch (err) {
        socket.emit('error', 'Failed to mark messages as read');
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Chat socket disconnected: ${socket.user.username}`);
    });
  });

  return io;
}

module.exports = { initChatSocket };
