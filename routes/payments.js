const express = require('express');
const { authMiddleware, verifiedOnly } = require('../middleware/auth');
const Milestone = require('../models/Milestone');
const Proposal = require('../models/Proposal');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Chat = require('../models/Chat');
const axios = require('axios');

const router = express.Router();

/**
 * Route: POST /payments/milestones/:id/pay
 * Action: Captures PayPal order, creates Transaction record, updates Milestone
 */
router.post('/milestones/:id/pay', authMiddleware, verifiedOnly, async (req, res) => {
    const { id } = req.params;
    const { paypalOrderId } = req.body;

    try {
        const milestone = await Milestone.findById(id).populate({
            path: 'proposal',
            populate: { path: 'seller', model: 'User' }
        });

        if (!milestone) return res.status(404).json({ error: "Milestone not found" });

        const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
        const tokenRes = await axios.post(`${process.env.PAYPAL_BASE_URL}/v1/oauth2/token`, 'grant_type=client_credentials', {
            headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const accessToken = tokenRes.data.access_token;

        const captureRes = await axios.post(
            `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders/${paypalOrderId}/capture`,
            {},
            { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
        );

        if (captureRes.data.status === 'COMPLETED') {
            const captureDetails = captureRes.data.purchase_units[0].payments.captures[0];
            const breakdown = captureDetails.seller_receivable_breakdown;

            const transaction = await Transaction.create({
                proposal: milestone.proposal._id,
                milestone: milestone._id,
                buyerID: req.user._id,
                sellerID: milestone.proposal.seller._id,
                amountPaid: parseFloat(breakdown.gross_amount.value),
                platformFee: parseFloat(breakdown.paypal_fee.value),
                sellerEarnings: parseFloat(breakdown.net_amount.value),
                currency: breakdown.gross_amount.currency_code,
                paymentID: captureDetails.id,
                payoutStatus: 'pending'
            });

            milestone.status = 'paid';
            milestone.buyerPaid = true;
            milestone.transaction = transaction._id;
            await milestone.save();

            return res.json({ success: true, milestone });
        } else {
            return res.status(400).json({ error: "Payment not completed", details: captureRes.data });
        }
    } catch (error) {
        console.error("Capture Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Capture failed", details: error.response?.data });
    }
});

router.post('/milestones/:id/create-order', authMiddleware, verifiedOnly, async (req, res) => {

  try {

    const milestone = await Milestone.findById(req.params.id);

    if (!milestone) return res.status(404).json({ error: "Milestone not found" });


    let accessToken;

    try {

      const tokenData = await getPayPalAccessToken();

      accessToken = tokenData.access_token;

    } catch (tokenErr) {

      console.error("TOKEN GENERATION ERROR:", tokenErr.message);

      return res.status(500).json({ error: "Could not generate PayPal Access Token", details: tokenErr.message });

    }


    const paypalUrl = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';



    const orderRes = await axios.post(`${paypalUrl}/v2/checkout/orders`, {

      intent: "CAPTURE",

      purchase_units: [{

        amount: {

          currency_code: "USD",

          value: milestone.price.toFixed(2)

        }

      }],

      application_context: {

        brand_name: "K4H",

        user_action: "PAY_NOW",

        return_url: `https://chat-k4h.vercel.app/dashboard?payment=success&milestoneId=${milestone._id}`,

        cancel_url: `https://chat-k4h.vercel.app/chat/${milestone.chat}?payment=cancelled`

      }

    }, {

      headers: {

        Authorization: `Bearer ${accessToken}`,

        "Content-Type": "application/json"

      }

    });


    const approveLink = orderRes.data.links.find(link => link.rel === 'approve');

    res.json({ redirectUrl: approveLink.href });


  } catch (error) {

    const errorMessage = error.response?.data || error.message;

    console.error("PAYPAL ORDER ERROR:", errorMessage);

    res.status(500).json({ error: "Order failed", details: errorMessage });

  }

});
/**
 * Route: POST /payments/milestones/:id/complete
 * Action: Seller marks work as submitted
 */
router.post('/milestones/:id/complete', authMiddleware, verifiedOnly, async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id).populate('proposal');
        if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

        if (milestone.proposal.seller.toString() !== req.user._id.toString())
            return res.status(403).json({ error: 'Unauthorized' });

        if (!milestone.buyerPaid) return res.status(400).json({ error: 'Milestone not funded' });

        milestone.status = 'completed';
        await milestone.save();

        res.json({ milestone });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Route: POST /payments/milestones/:id/release
 * Action: Buyer releases held funds to the Seller
 */
// router.post('/milestones/:id/release', authMiddleware, verifiedOnly, async (req, res) => {
//     const { id } = req.params;

//     try {
//         const milestone = await Milestone.findById(id).populate({
//             path: 'proposal',
//             populate: { path: 'seller', model: 'User' }
//         }).populate('transaction');

//         if (!milestone) return res.status(404).json({ error: "Milestone not found" });
//         if (milestone.proposal.buyer.toString() !== req.user._id.toString())
//             return res.status(403).json({ error: "Unauthorized" });
//         if (milestone.paidToSeller) return res.status(400).json({ error: "Funds already released" });

//         const seller = milestone.proposal.seller;
//         if (!seller.paypal_account?.email) return res.status(400).json({ error: "Seller has no PayPal email linked" });

//         const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
//         const tokenRes = await axios.post(`${process.env.PAYPAL_BASE_URL}/v1/oauth2/token`, 'grant_type=client_credentials', {
//             headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }
//         });
//         const accessToken = tokenRes.data.access_token;

//         const payoutResponse = await axios.post(
//             `${process.env.PAYPAL_BASE_URL}/v1/payments/payouts`,
//             {
//                 sender_batch_header: {
//                     sender_batch_id: `batch_${milestone._id}_${Date.now()}`,
//                     email_subject: "Payment Received",
//                 },
//                 items: [{
//                     recipient_type: "EMAIL",
//                     amount: {
//                         value: milestone.transaction.sellerEarnings.toString(),
//                         currency: "USD"
//                     },
//                     receiver: seller.paypal_account.email,
//                     note: `Milestone: ${milestone.title}`,
//                     sender_item_id: milestone._id.toString()
//                 }]
//             },
//             {
//                 headers: {
//                     'Authorization': `Bearer ${accessToken}`,
//                     'Content-Type': 'application/json'
//                 }
//             }
//         );

//         milestone.paidToSeller = true;
//         milestone.status = 'completed';
//         await milestone.save();

//         if (milestone.transaction) {
//             await Transaction.findByIdAndUpdate(milestone.transaction._id, {
//                 payoutStatus: 'sent',
//                 payoutID: payoutResponse.data.batch_header.payout_batch_id,
//                 completedAt: new Date()
//             });
//         }

//         await Chat.updateOne({ _id: milestone.chat }, { activeMilestone: null });

//         res.json({ success: true, message: "Funds released to seller" });

//     } catch (error) {
//         console.error("Payout Error:", error.response?.data || error.message);
//         res.status(500).json({ error: "Payout failed", details: error.response?.data });
//     }
// });

/**
 * Route: POST /payments/milestones/:id/refund
 * Action: Refunds the Buyer using the PayPal Capture ID
 */
router.post('/milestones/:id/refund', authMiddleware, verifiedOnly, async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id).populate('proposal transaction');

        if (!milestone || !milestone.transaction) return res.status(404).json({ error: 'Record not found' });
        if (milestone.paidToSeller) return res.status(400).json({ error: 'Cannot refund after payout' });

        const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
        const tokenRes = await axios.post(`${process.env.PAYPAL_BASE_URL}/v1/oauth2/token`, 'grant_type=client_credentials', {
            headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const accessToken = tokenRes.data.access_token;

        await axios.post(
            `${process.env.PAYPAL_BASE_URL}/v2/payments/captures/${milestone.transaction.paymentID}/refund`,
            { note_to_payer: "Milestone refund processed by platform" },
            { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
        );
B
        milestone.status = 'refunded';
        await milestone.save();

        await Transaction.findByIdAndUpdate(milestone.transaction._id, { payoutStatus: 'refunded' });
        await Chat.updateOne({ _id: milestone.chat }, { activeMilestone: null });

        res.json({ success: true, message: "Refund processed" });
    } catch (error) {
        console.error("Refund Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Refund failed" });
    }
});

module.exports = router;
