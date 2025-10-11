require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const setupSwagger = require('./config/swagger');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.enable('trust proxy');
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: true,       
    httpOnly: true,  
    sameSite: 'lax'    
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.set('io', io);
setupSwagger(app);
mongoose.connect(process.env.MONGODB_URI);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require('./models/User');
    const user = await User.findById(decoded.userId);
    if (!user) return next(new Error('User not found'));

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user_${socket.userId}`);

  socket.on('disconnect', () => {});

  socket.on('mark_notification_read', async (notificationId) => {
    try {
      const Notification = require('./models/Notification');
      await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: socket.userId },
        { read: true, readAt: new Date() }
      );

      const unreadCount = await Notification.countDocuments({
        recipient: socket.userId,
        read: false
      });

      socket.emit('unread_count_updated', unreadCount);
    } catch (error) {
      socket.emit('error', 'Failed to mark notification as read');
    }
  });

  socket.on('delete_notification', async (notificationId) => {
    try {
      const Notification = require('./models/Notification');
      await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: socket.userId
      });

      socket.emit('notification_deleted', notificationId);
    } catch (error) {
      socket.emit('error', 'Failed to delete notification');
    }
  });
});

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const serviceRoutes = require('./routes/services');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const verificationRoutes = require('./routes/verification');
const paypalRoutes = require('./routes/paypal');
const notificationRoutes = require('./routes/notifications');
const ratingRoutes = require('./routes/ratings');
const feedbackRoutes = require('./routes/feedbacks');

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/services', serviceRoutes);
app.use('/admin', adminRoutes);
app.use('/', paymentRoutes);
app.use('/', verificationRoutes);
app.use('/paypal', paypalRoutes);
app.use('/notifications', notificationRoutes);
app.use('/rating', ratingRoutes);
app.use('/feedback', feedbackRoutes);
app.get('/', (req, res) => res.redirect('/api-docs'));
app.get('/inbox', (req, res) => res.render('inbox'));

server.listen(3000, () => {});
