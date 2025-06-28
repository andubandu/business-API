require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB_URI);

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const serviceRoutes = require('./routes/services');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const verificationRoutes = require('./routes/verification');
const paypalRoutes = require('./routes/paypal')

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/services', serviceRoutes);
app.use('/admin', adminRoutes);
app.use('/', paymentRoutes);
app.use('/verify', verificationRoutes);
app.use('/paypal', paypalRoutes)
app.get('/', (req,res) => res.redirect('/docs'))
app.get('/docs', (req, res) => {
  res.render('docs');
});

app.listen(3000, () => {
  console.log(`Server running on  http://localhost:3000`);
});