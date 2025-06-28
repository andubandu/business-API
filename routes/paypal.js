const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const User = require('../models/User');

const router = express.Router();

router.post('/connect', authMiddleware, validate(schemas.paypalConnect), async (req, res) => {
  try {
    const { paypal_email, merchant_id } = req.body;
    
    if (req.user.verification_status !== 'approved') {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'Only approved developers can connect PayPal accounts' 
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      'paypal_account.email': paypal_email,
      'paypal_account.merchant_id': merchant_id,
      'paypal_account.connected': true,
      'paypal_account.connected_at': new Date(),
      'paypal_account.last_verified': new Date()
    });

    res.json({ 
      message: 'PayPal account connected successfully',
      paypal_email: paypal_email
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('paypal_account');
    
    res.json({
      connected: user.paypal_account.connected,
      email: user.paypal_account.email,
      connected_at: user.paypal_account.connected_at,
      last_verified: user.paypal_account.last_verified
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/update', authMiddleware, validate(schemas.paypalConnect), async (req, res) => {
  try {
    const { paypal_email, merchant_id } = req.body;
    
    await User.findByIdAndUpdate(req.user._id, {
      'paypal_account.email': paypal_email,
      'paypal_account.merchant_id': merchant_id,
      'paypal_account.last_verified': new Date()
    });

    res.json({ 
      message: 'PayPal account updated successfully',
      paypal_email: paypal_email
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/disconnect', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      'paypal_account.email': '',
      'paypal_account.merchant_id': '',
      'paypal_account.connected': false,
      'paypal_account.connected_at': null,
      'paypal_account.last_verified': null
    });

    res.json({ message: 'PayPal account disconnected successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;