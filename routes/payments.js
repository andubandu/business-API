require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth.js');
const { processPayoutToSeller } = require('../utils/paypal');
const { notifyServicePurchase, notifyPayoutSent, notifyPayoutFailed } = require('../utils/notifications.js');
const Service = require('../models/Service.js');
const Transaction = require('../models/Transaction.js');
const Cart = require('../models/Cart.js');
const UsedToken = require('../models/usedToken.js')
const router = express.Router();
const ENC_SECRET = Buffer.from(process.env.ENC_SECRET, 'hex');
const cookieParser = require('cookie-parser');
router.use(cookieParser());

function roundToTwoDecimals(amount) {
  return Math.round(amount * 100) / 100;
}

function decryptToken(token) {
  const [ivHex, encrypted] = token.split(':');
  if (!ivHex || !encrypted) throw new Error('Malformed token');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENC_SECRET, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

router.get('/cart/checkout', async (req, res) => {
  try {
    const token = req.query.token;
    const cookie = req.cookies.token
    if (!token) return res.status(401).json({ error: 'Missing token' });

    let payload;
    try {
      payload = decryptToken(decodeURIComponent(token));
    } catch (e) {
      return res.status(403).json({ error: 'Invalid token' });
    }


    if (Date.now() - payload.ts > 5 * 60 * 1000) {
      return res.status(403).json({ error: 'Token expired' });
    }

    const cart = await Cart.findById(payload.cartID).populate('items.product');
    if (!cart || cart.user.toString() !== payload.userID) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const unavailable = cart.items.filter(
      i => !i.product || i.product.type === 'request'
    );
    if (unavailable.length > 0) {
      return res.status(400).json({ error: 'Some services are unavailable' });
    }
    
    let subtotal = 0;
    cart.items.forEach(item => {
      subtotal += item.product.price * item.quantity;
    });
    const platformFee = subtotal * 0.1;
    const total = subtotal + platformFee;

    res.render('cartCheckout', {
      cart,
      paypal_client_id: process.env.PAYPAL_CLIENT_ID,
      paypal_email: process.env.PAYPAL_BUSINESS_ACCOUNT,
      token,
      cookie,
      subtotal,
      platformFee,
      total
    });
  } catch (err) {
    console.error('Cart checkout error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// router.post('/cart/success/:cartID', authMiddleware, async (req, res) => {
//   const { paymentID, amount, currency = 'USD', paypal_order_id } = req.body;
//   const cart = await Cart.findById(req.params.cartID).populate('items.product');
//   if (!cart) return res.status(404).json({ error: 'Cart not found' });

//   const results = [];
//   for (const item of cart.items) {
//     const service = item.product;
//     const developerEarnings = roundToTwoDecimals(service.price * 0.9 * item.quantity);
//     const platformEarnings = roundToTwoDecimals(service.price * 0.1 * item.quantity);

//     const transaction = new Transaction({
//       serviceID: service._id,
//       buyerID: req.user._id,
//       sellerID: service.owner._id,
//       amountPaid: service.price * item.quantity,
//       currency,
//       platformEarnings,
//       developerEarnings
//     });
//     await transaction.save();
//     await notifyServicePurchase(service.owner._id, req.user._id, service, transaction);

//     try {
//       const payoutResult = await processPayoutToSeller(
//         service.owner.paypal_account.email,
//         developerEarnings,
//         currency,
//         `Payment for service: ${service.title}`,
//         transaction._id.toString()
//       );
//       await Transaction.findByIdAndUpdate(transaction._id, {
//         payout_id: payoutResult.batch_id,
//         payout_status: 'sent',
//         payout_sent_at: new Date()
//       });
//       await notifyPayoutSent(service.owner._id, transaction, payoutResult.batch_id);
//       results.push({ transaction: transaction._id, payout_id: payoutResult.batch_id, developer_earnings: developerEarnings, platform_earnings: platformEarnings });
//     } catch (payoutError) {
//       await Transaction.findByIdAndUpdate(transaction._id, { payout_status: 'failed', payout_error: payoutError.message });
//       await notifyPayoutFailed(service.owner._id, transaction, payoutError.message);
//       results.push({ transaction: transaction._id, warning: 'Developer payout failed' });
//     }
//   }

// await Cart.findByIdAndDelete(cart._id);
//   res.json({ message: 'Cart payment processed', results });
// });

router.post('/token-used', async (req, res) => {
  try {
    const { token, cartID } = req.body;
    if (!token) return res.status(400).json({ error: 'Missing token' });

    const exists = await UsedToken.findOne({ token });
    if (exists) return res.status(400).json({ error: 'Token already used' });

    await UsedToken.create({ token });

    if (cartID) {
      const cart = await Cart.findById(cartID).populate('items.product');
      if (cart) {
        for (const item of cart.items) {
          const service = item.product;
          const transaction = new Transaction({
            serviceID: service._id,
            buyerID: cart.user,
            sellerID: service.owner,
            amountPaid: service.price * item.quantity,
            currency: 'USD',
            platformEarnings: roundToTwoDecimals(service.price * 0.1 * item.quantity),
            developerEarnings: roundToTwoDecimals(service.price * 0.9 * item.quantity)
          });
          await transaction.save();
        }
      }
      await Cart.findByIdAndDelete(cartID);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error marking token used:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});



router.get('/thank-you', (req, res) => {
  res.render('thank-you');
});

module.exports = router;
