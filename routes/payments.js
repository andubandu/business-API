const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { convertPrice } = require('../utils/currency');
const Service = require('../models/Service');
const Transaction = require('../models/Transaction');

const router = express.Router();

router.get('/buy/:serviceID', async (req, res) => {
  try {
    const { currency } = req.query;
    const service = await Service.findById(req.params.serviceID).populate('owner', 'username real_name');
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    let displayPrice = service.price;
    let displayCurrency = service.currency;
    
    if (currency && currency.toUpperCase() !== service.currency) {
      displayPrice = await convertPrice(service.price, service.currency, currency.toUpperCase());
      displayCurrency = currency.toUpperCase();
    }
    
    res.render('buy', { 
      service: {
        ...service.toObject(),
        price: displayPrice,
        currency: displayCurrency
      }, 
      paypal_client_id: process.env.PAYPAL_CLIENT_ID 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/payment/success', authMiddleware, async (req, res) => {
  try {
    const { serviceID, paymentID, amount, currency = 'USD' } = req.body;
    
    const service = await Service.findById(serviceID);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const amountPaid = parseFloat(amount);
    const platformEarnings = amountPaid * 0.4;
    const developerEarnings = amountPaid * 0.6;

    const transaction = new Transaction({
      serviceID,
      buyerID: req.user._id,
      sellerID: service.owner,
      amountPaid,
      currency: currency.toUpperCase(),
      platformEarnings,
      developerEarnings
    });

    await transaction.save();
    res.json({ message: 'Payment successful', transaction });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;