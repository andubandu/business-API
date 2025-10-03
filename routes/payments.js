require('dotenv').config();
const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { validate, validateParams, schemas } = require('../middleware/validation');
const { processPayoutToSeller } = require('../utils/paypal');
const { notifyServicePurchase, notifyPayoutSent, notifyPayoutFailed } = require('../utils/notifications');
const Service = require('../models/Service');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const router = express.Router();

function roundToTwoDecimals(amount) {
  return Math.round(amount * 100) / 100;
}

router.get('/buy/:serviceID', validateParams(schemas.buyServiceParams), async (req, res) => {
  try {
    const service = await Service.findById(req.params.serviceID).populate('owner', 'username real_name paypal_account');
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (!service.owner.paypal_account.connected) {
      return res.status(400).json({ 
        error: 'Service unavailable', 
        message: 'This service is temporarily unavailable as the developer has not connected their PayPal account.' 
      });
    }
    
    res.render('buy', { 
      service: service.toObject(),
      paypal_client_id: process.env.PAYPAL_CLIENT_ID,
      platform_email: process.env.PAYPAL_PLATFORM_EMAIL || 'hilariousaction@gmail.com'
    });
  } catch (error) {
    console.error('Buy page error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/payment/success', authMiddleware, validate(schemas.paymentSuccess), async (req, res) => {
  try {
    const { serviceID, paymentID, amount, currency = 'USD', paypal_order_id } = req.body;
    
    const service = await Service.findById(serviceID).populate('owner', 'paypal_account');
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (!service.owner.paypal_account.connected) {
      return res.status(400).json({ 
        error: 'Payment failed', 
        message: 'Cannot process payment - seller PayPal account not connected' 
      });
    }

    const developerEarnings = roundToTwoDecimals(amount * 0.6);
    const platformEarnings = roundToTwoDecimals(amount * 0.4);

    const transaction = new Transaction({
      serviceID,
      buyerID: req.user._id,
      sellerID: service.owner._id,
      amountPaid: amount,
      currency,
      platformEarnings,
      developerEarnings
    });

    await transaction.save();

    await notifyServicePurchase(service.owner._id, req.user._id, service, transaction);

    try {
      const payoutResult = await processPayoutToSeller(
        service.owner.paypal_account.email,
        developerEarnings,
        currency,
        `Payment for service: ${service.title}`,
        transaction._id.toString()
      );

      await Transaction.findByIdAndUpdate(transaction._id, {
        payout_id: payoutResult.batch_id,
        payout_status: 'sent',
        payout_sent_at: new Date()
      });
      await notifyPayoutSent(service.owner._id, transaction, payoutResult.batch_id);

      res.json({ 
        message: 'Payment successful and payout sent to developer',
        transaction: transaction._id,
        platform_earnings: platformEarnings.toFixed(2),
        developer_earnings: developerEarnings.toFixed(2),
        currency: currency,
        payout_id: payoutResult.batch_id
      });
    } catch (payoutError) {
      console.error('Payout error:', payoutError);
      await Transaction.findByIdAndUpdate(transaction._id, {
        payout_status: 'failed',
        payout_error: payoutError.message
      });
      await notifyPayoutFailed(service.owner._id, transaction, payoutError.message);

      res.json({ 
        message: 'Payment successful but payout failed - will be processed manually',
        transaction: transaction._id,
        platform_earnings: platformEarnings.toFixed(2),
        developer_earnings: developerEarnings.toFixed(2),
        currency: currency,
        warning: 'Developer payout will be processed manually'
      });
    }
  } catch (error) {
    console.error('Payment success error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;