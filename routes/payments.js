require('dotenv').config();
const express = require('express');
const { authMiddleware } = require('../middleware/auth.js');
const { validate, validateParams, schemas } = require('../middleware/validation.js');
const { processPayoutToSeller } = require('../utils/paypal');
const { notifyServicePurchase, notifyPayoutSent, notifyPayoutFailed } = require('../utils/notifications.js');
const Service = require('../models/Service.js');
const Transaction = require('../models/Transaction.js');
const User = require('../models/User.js');

const router = express.Router();

function roundToTwoDecimals(amount) {
  return Math.round(amount * 100) / 100;
}

/**
 * @swagger
 * tags:
 *   - name: Payments
 *     description: >
 *       Handles service purchases and PayPal payouts between buyers and developers.  
 *       ---
 *       💡 **Note:**  
 *       - The `/buy/:serviceID` route renders the purchase page (HTML).  
 *       - After successful PayPal payment, `/payment/success` records the transaction and attempts payout to the seller automatically.
 */

/**
 * @swagger
 * /payments/buy/{serviceID}:
 *   get:
 *     summary: Render the buy page for a specific service
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: serviceID
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the service being purchased
 *     responses:
 *       200:
 *         description: Rendered PayPal checkout page for the service
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: "<!DOCTYPE html><html><body>PayPal Checkout Page...</body></html>"
 *       404:
 *         description: Service not found
 *       400:
 *         description: Service unavailable (PayPal not connected)
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /payments/payment/success:
 *   post:
 *     summary: Handle successful payment and process payout to seller
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceID
 *               - paymentID
 *               - amount
 *             properties:
 *               serviceID:
 *                 type: string
 *                 description: ID of the purchased service
 *               paymentID:
 *                 type: string
 *                 description: PayPal payment ID
 *               amount:
 *                 type: number
 *                 description: Total amount paid by buyer
 *               currency:
 *                 type: string
 *                 default: USD
 *               paypal_order_id:
 *                 type: string
 *                 description: PayPal order ID
 *             example:
 *               serviceID: "66f0a1b52a93f83b32b7e0d5"
 *               paymentID: "PAYID-123456789"
 *               amount: 25.00
 *               currency: "USD"
 *               paypal_order_id: "O-9E12345ABCDE"
 *     responses:
 *       200:
 *         description: Payment successful, payout processed or queued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 transaction:
 *                   type: string
 *                 platform_earnings:
 *                   type: string
 *                 developer_earnings:
 *                   type: string
 *                 currency:
 *                   type: string
 *                 payout_id:
 *                   type: string
 *                   nullable: true
 *                 warning:
 *                   type: string
 *                   nullable: true
 *               example:
 *                 message: "Payment successful and payout sent to developer"
 *                 transaction: "66f0a21c1d3c5a1b16f3d93e"
 *                 platform_earnings: "10.00"
 *                 developer_earnings: "15.00"
 *                 currency: "USD"
 *                 payout_id: "PAYOUT-ABC123"
 *       400:
 *         description: Seller PayPal account not connected
 *       404:
 *         description: Service not found
 *       500:
 *         description: Server error
 */
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

    const developerEarnings = roundToTwoDecimals(amount * 0.9);
    const platformEarnings = roundToTwoDecimals(amount * 0.1);

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

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

module.exports = router;
