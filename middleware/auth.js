require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User.js');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.userId) return res.status(401).json({ error: 'Invalid token' });

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    req.user = {
      _id: user._id,
      role: user.role,
      verification_status: user.verification_status,
      paypal_account: user.paypal_account,
      user_type: user.user_type
    };

    next();
  } catch (error) {
    console.error('AuthMiddleware error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};


const adminMiddleware = (req, res, next) => {
  if (req.user && ['admin', 'moderator', 'owner'].includes(req.user.role)) {
    return next();
  }
  res.status(403).json({ error: 'Admin access required' });
};

async function verifiedOnly(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.verification_status !== 'approved') {
      return res.status(403).json({ error: 'Account not verified.' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
}

module.exports = { authMiddleware, adminMiddleware, verifiedOnly };
