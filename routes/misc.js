const Transaction = require("../models/Transaction");
const Milestone = require("../models/Milestone");
const express = require("express");
const router = express.Router();

router.post('/manual-transaction', async (req, res) => {
  try {
    const { milestoneId, payerId, payeeId, amount, currency, paymentID } = req.body;

    if (!milestoneId || !payerId || !payeeId || !amount || !currency || !paymentID) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) return res.status(404).json({ error: "Milestone not found." });

    const platformFee = parseFloat((amount * 0.10).toFixed(2));
    const sellerEarnings = parseFloat((amount - platformFee).toFixed(2));

    const transaction = await Transaction.create({
      proposal: milestone.proposal,
      milestone: milestone._id,
      buyerID: payerId,
      sellerID: payeeId,
      amountPaid: amount,
      platformFee,
      sellerEarnings,
      currency,
      paymentID,
      payoutStatus: 'pending'
    });

    milestone.status = 'paid';
    milestone.buyerPaid = true;
    milestone.transaction = transaction._id;
    await milestone.save();

    return res.json({ success: true, milestone, transaction });
  } catch (err) {
    console.error("Manual transaction error:", err);
    res.status(500).json({ error: "Failed to create transaction." });
  }
});

module.exports = router;
