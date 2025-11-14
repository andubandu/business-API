require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const setupSwagger = require('./config/swagger.js');
const { authMiddleware } = require('./middleware/auth.js');
const { initChatSocket } = require('./config/socket');
const Cart = require('./models/Cart.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const ENC_SECRET = process.env.ENC_SECRET;

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
  cookie: { secure: true, httpOnly: true, sameSite: 'lax' }
}));

app.use(passport.initialize());
app.use(passport.session());
app.set('io', io);

setupSwagger(app);

mongoose.connect(process.env.MONGODB_URI)

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
  console.log(`🔔 Notification socket connected: ${socket.user.username}`);

  socket.on('mark_notification_read', async (notificationId) => {
    try {
      const Notification = require('./models/Notification');
      await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: socket.userId },
        { read: true, readAt: new Date() }
      );
      const unreadCount = await Notification.countDocuments({ recipient: socket.userId, read: false });
      socket.emit('unread_count_updated', unreadCount);
    } catch (error) {
      socket.emit('error', 'Failed to mark notification as read');
    }
  });

  socket.on('delete_notification', async (notificationId) => {
    try {
      const Notification = require('./models/Notification');
      await Notification.findOneAndDelete({ _id: notificationId, recipient: socket.userId });
      socket.emit('notification_deleted', notificationId);
    } catch (error) {
      socket.emit('error', 'Failed to delete notification');
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Notification socket disconnected: ${socket.user.username}`);
  });
});

initChatSocket(server);

app.use('/auth', require('./routes/auth'));
app.use('/users', require('./routes/users'));
app.use('/services', require('./routes/services'));
app.use('/admin', require('./routes/admin'));
app.use('/payments', require('./routes/payments'));
app.use('/', require('./routes/verification'));
app.use('/paypal', require('./routes/paypal'));
app.use('/cart', require('./routes/cart'));
app.use('/notifications', require('./routes/notifications'));
app.use('/rating', require('./routes/ratings'));
app.use('/feedback', require('./routes/feedbacks'));
app.use('/proposals', require('./routes/proposals'));
app.use('/chat', require('./routes/chat'));
app.get('/', (req, res) => res.redirect('/api-docs'));
app.get('/inbox', (req, res) => res.render('inbox'));

function encryptToken(data) {
  const key = Buffer.from(ENC_SECRET, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decryptToken(token) {
  const key = Buffer.from(ENC_SECRET, 'hex');
  const [ivHex, encrypted] = token.split(':');
  if (!ivHex || !encrypted) throw new Error('Malformed token');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

app.get('/redirect', authMiddleware, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    const payload = {
      cartID: cart._id.toString(),
      userID: req.user._id.toString(),
      nonce: crypto.randomBytes(8).toString('hex'),
      ts: Date.now()
    };

    const encryptedToken = encryptToken(payload);
    const checkoutUrl = `${process.env.BASE_URL}/payments/cart/checkout?token=${encodeURIComponent(encryptedToken)}`;

    res.json({
      message: 'Checkout link generated',
      checkout_url: checkoutUrl,
      expires_in: '5 minutes'
    });
  } catch (err) {
    console.error('Redirect error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// app.listen(3000)
server.listen(3000, () => {
  console.log("socket and backend running on http://localhost:3000");
})
