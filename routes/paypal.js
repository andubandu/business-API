const express = require('express');
const { authMiddleware } = require('../middleware/auth.js');
const { validate, schemas } = require('../middleware/validation.js');
const User = require('../models/User.js');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: PayPal
 *     description: |
 *       Manage developer PayPal accounts (connect, update, disconnect, check status).  
 *       **Note:** Only approved developers can connect PayPal accounts. Ensure email and merchant ID are correct to receive payouts.
 */

router.get('*', (req, res) => {
  res.json({ message: 'PayPal routes are currently disabled.' });
});

/**
 * @swagger
 * /paypal/connect:
 *   post:
 *     summary: Connect a PayPal account
 *     tags: [PayPal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paypal_email
 *             properties:
 *               paypal_email:
 *                 type: string
 *                 description: Developer's PayPal email
 *               merchant_id:
 *                 type: string
 *                 description: Optional PayPal merchant ID
 *             example:
 *               paypal_email: "developer@example.com"
 *               merchant_id: "MERCHANT123"
 *     responses:
 *       200:
 *         description: PayPal account connected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 paypal_email:
 *                   type: string
 *                 merchant_id:
 *                   type: string
 *               example:
 *                 message: "PayPal account connected successfully"
 *                 paypal_email: "developer@example.com"
 *                 merchant_id: "MERCHANT123"
 *       403:
 *         description: Only approved developers can connect PayPal
 *       500:
 *         description: Server error
 */
// router.post('/connect', authMiddleware, validate(schemas.paypalConnect), async (req, res) => {
//   try {
//     const { paypal_email, merchant_id } = req.body;
    
//     // if (req.user.verification_status !== 'approved') {
//     //   return res.status(403).json({ 
//     //     error: 'Access denied', 
//     //     message: 'Only approved developers can connect PayPal accounts' 
//     //   });
//     // }

//     await User.findByIdAndUpdate(req.user._id, {
//       'paypal_account.email': paypal_email,
//       'paypal_account.merchant_id': merchant_id || '',
//       'paypal_account.connected': true,
//       'paypal_account.connected_at': new Date(),
//       'paypal_account.last_verified': new Date()
//     });

//     res.json({ 
//       message: 'PayPal account connected successfully',
//       paypal_email: paypal_email,
//       merchant_id: merchant_id || 'Not provided'
//     });
//   } catch (error) {
//     res.status(500).json({ error: 'Server error' });
//   }
// });

/**
 * @swagger
 * /paypal/status:
 *   get:
 *     summary: Get PayPal account status
 *     tags: [PayPal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current status of developer's PayPal account
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected:
 *                   type: boolean
 *                 email:
 *                   type: string
 *                 merchant_id:
 *                   type: string
 *                 connected_at:
 *                   type: string
 *                   format: date-time
 *                 last_verified:
 *                   type: string
 *                   format: date-time
 *               example:
 *                 connected: true
 *                 email: "developer@example.com"
 *                 merchant_id: "MERCHANT123"
 *                 connected_at: "2025-10-10T12:34:56Z"
 *                 last_verified: "2025-10-10T12:34:56Z"
 *       500:
 *         description: Server error
 */
// router.get('/status', authMiddleware, async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id).select('paypal_account');
    
//     res.json({
//       connected: user.paypal_account.connected,
//       email: user.paypal_account.email,
//       merchant_id: user.paypal_account.merchant_id,
//       connected_at: user.paypal_account.connected_at,
//       last_verified: user.paypal_account.last_verified
//     });
//   } catch (error) {
//     res.status(500).json({ error: 'Server error' });
//   }
// });

/**
 * @swagger
 * /paypal/update:
 *   patch:
 *     summary: Update PayPal account details
 *     tags: [PayPal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paypal_email
 *             properties:
 *               paypal_email:
 *                 type: string
 *               merchant_id:
 *                 type: string
 *             example:
 *               paypal_email: "developer_new@example.com"
 *               merchant_id: "MERCHANT456"
 *     responses:
 *       200:
 *         description: PayPal account updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 paypal_email:
 *                   type: string
 *                 merchant_id:
 *                   type: string
 *               example:
 *                 message: "PayPal account updated successfully"
 *                 paypal_email: "developer_new@example.com"
 *                 merchant_id: "MERCHANT456"
 *       500:
 *         description: Server error
 */
// router.patch('/update', authMiddleware, validate(schemas.paypalConnect), async (req, res) => {
//   try {
//     const { paypal_email, merchant_id } = req.body;
    
//     await User.findByIdAndUpdate(req.user._id, {
//       'paypal_account.email': paypal_email,
//       'paypal_account.merchant_id': merchant_id || '',
//       'paypal_account.last_verified': new Date()
//     });

//     res.json({ 
//       message: 'PayPal account updated successfully',
//       paypal_email: paypal_email,
//       merchant_id: merchant_id || 'Not provided'
//     });
//   } catch (error) {
//     res.status(500).json({ error: 'Server error' });
//   }
// });


/**
 * @swagger
 * /paypal/disconnect:
 *   post:
 *     summary: Disconnect PayPal account
 *     tags: [PayPal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: PayPal account disconnected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                 message: "PayPal account disconnected successfully"
 *       500:
 *         description: Server error
 */
// router.post('/disconnect', authMiddleware, async (req, res) => {
//   try {
//     await User.findByIdAndUpdate(req.user._id, {
//       'paypal_account.email': '',
//       'paypal_account.merchant_id': '',
//       'paypal_account.connected': false,
//       'paypal_account.connected_at': null,
//       'paypal_account.last_verified': null
//     });

//     res.json({ message: 'PayPal account disconnected successfully' });
//   } catch (error) {
//     res.status(500).json({ error: 'Server error' });
//   }
// });

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
