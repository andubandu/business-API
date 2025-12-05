const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const Chat = require('../models/Chat')
const Message = require('../models/Message')
const Notification = require('../models/Notification')
const User = require('../models/User')
const Milestone = require('../models/Milestone')

let io

function authMiddlewareSocket(socket, next) {
  try {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('Authentication required'))
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    User.findById(decoded.userId)
      .then(user => {
        if (!user) return next(new Error('User not found'))
        socket.userId = user._id.toString()
        socket.user = user
        next()
      })
      .catch(() => next(new Error('Authentication failed')))
  } catch {
    next(new Error('Authentication failed'))
  }
}

function initSocket(server) {
  if (io) return io

  io = new Server(server, {
    cors: {
      origin: [
        "https://chat-k4h.vercel.app",
        "https://k4h.dev",
        "http://localhost:5173",
        "https://koders4hire.vercel.app"
      ],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.use(authMiddlewareSocket)

  io.on('connection', async socket => {
    console.log(`Socket connected: ${socket.user.username}`)
    
    try {
      const chats = await Chat.find({ participants: socket.userId })
      chats.forEach(c => socket.join(c._id.toString()))
    } catch (err) {
      console.error('Error joining chat rooms:', err)
    }

    // ===== CHAT =====
    socket.on('send_message', async ({ chatId, content, type, milestoneId }) => {
      if (!chatId || !content) return
      try {
        const chat = await Chat.findById(chatId)
        if (!chat || !chat.participants.includes(socket.userId)) return

        const message = await new Message({
          chat: chat._id,
          sender: socket.userId,
          content,
          type: type || 'text',
          milestone: milestoneId || undefined
        }).save()

        chat.lastMessage = message._id
        chat.updatedAt = new Date()
        await chat.save()

        io.to(chat._id.toString()).emit('new_message', {
          ...message.toObject(),
          sender: { _id: socket.user._id, username: socket.user.username, real_name: socket.user.real_name, profile_image: socket.user.profile_image }
        })
      } catch (err) {
        console.error('send_message error:', err)
      }
    })

    socket.on('typing', ({ chatId, isTyping }) => {
      if (!chatId) return
      socket.to(chatId).emit('typing', { chatId, userId: socket.userId, isTyping })
    })

    socket.on('mark_read', async chatId => {
      try {
        await Message.updateMany(
          { chat: chatId, sender: { $ne: socket.userId }, read: false },
          { read: true }
        )
        io.to(chatId).emit('messages_read', { chatId, userId: socket.userId })
      } catch (err) { console.error(err) }
    })

    socket.on('create_milestone', async ({ chatId, milestoneData }) => {
      try {
        const chat = await Chat.findById(chatId)
        if (!chat || !chat.participants.includes(socket.userId)) return
        const milestone = await new Milestone({ ...milestoneData, chat: chatId, createdBy: socket.userId }).save()
        io.to(chatId).emit('milestone_created', { chatId, milestone })
      } catch (err) { console.error(err) }
    })

    // ===== NOTIFICATIONS =====
    socket.on('notification_read', async notificationId => {
      try {
        await Notification.findOneAndUpdate(
          { _id: notificationId, recipient: socket.userId },
          { read: true, readAt: new Date() }
        )
        const unreadCount = await Notification.countDocuments({ recipient: socket.userId, read: false })
        socket.emit('notification_unread_count', unreadCount)
      } catch (err) { console.error(err) }
    })

    socket.on('notification_delete', async notificationId => {
      try {
        await Notification.findOneAndDelete({ _id: notificationId, recipient: socket.userId })
        socket.emit('notification_deleted', notificationId)
      } catch (err) { console.error(err) }
    })

    socket.on('disconnect', () => console.log(`Socket disconnected: ${socket.user.username}`))
  })

  return io
}

module.exports = { initSocket }
