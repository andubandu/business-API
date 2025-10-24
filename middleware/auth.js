require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.userId) return res.status(401).json({ error: 'Invalid token' });

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = {
      id: user._id,
      role: user.role,
      verification_status: user.verification_status
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

module.exports = { authMiddleware, adminMiddleware };