const express = require('express');
const { authMiddleware, verifiedOnly } = require('../middleware/auth');
const Milestone = require('../models/Milestone');
const Proposal = require('../models/Proposal');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Chat = require('../models/Chat');
const { processPayoutToSeller } = require('../utils/paypal');
const router = express.Router();

function roundTwo(amount) {
  return Math.round(amount * 100) / 100;
}

router.post('/milestones/:id/pay', authMiddleware, verifiedOnly, async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id).populate('proposal');
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

    const proposal = milestone.proposal;
    if (proposal.buyer.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Only buyer can pay milestone' });

    if (milestone.buyerPaid) return res.status(400).json({ error: 'Milestone already paid' });

    const seller = await User.findById(proposal.seller);
    if (!seller.paypal_account.connected)
      return res.status(400).json({ error: 'Seller must have PayPal connected' });

    milestone.buyerPaid = true;
    milestone.status = 'in_progress';
    await milestone.save();

    const platformFee = roundTwo(milestone.price * 0.1);
    const sellerEarnings = roundTwo(milestone.price * 0.9);

    const transaction = await Transaction.create({
      proposal: proposal._id,
      milestone: milestone._id,
      buyerID: req.user._id,
      sellerID: seller._id,
      amountPaid: milestone.price,
      platformFee,
      sellerEarnings,
      currency: 'USD'
    });

    res.json({ milestone, transaction });
  } catch (err) {
    console.error('[Milestone Pay Error]:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.post('/milestones/:id/complete', authMiddleware, verifiedOnly, async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id).populate('proposal');
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

    const proposal = milestone.proposal;
    if (proposal.seller.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Only seller can complete milestone' });

    if (!milestone.buyerPaid) return res.status(400).json({ error: 'Milestone not paid yet' });
    if (milestone.status !== 'in_progress') return res.status(400).json({ error: 'Milestone not in progress' });

    milestone.status = 'completed';
    await milestone.save();

    res.json({ milestone });
  } catch (err) {
    console.error('[Milestone Complete Error]:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});
router.post('/milestones/:id/confirm', authMiddleware, verifiedOnly, async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id).populate('proposal');
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

    const proposal = milestone.proposal;
    if (proposal.buyer.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Only buyer can confirm milestone' });

    if (milestone.status !== 'completed') return res.status(400).json({ error: 'Milestone not completed yet' });

    const seller = await User.findById(proposal.seller);

    try {
      const payout = await processPayoutToSeller(seller.paypal_account.email, milestone.price * 0.9, 'USD', `Payment for milestone ${milestone.title}`);

      milestone.status = 'paid';
      await milestone.save();

      const transaction = await Transaction.findOne({ milestone: milestone._id });
      transaction.payoutStatus = 'sent';
      transaction.payoutID = payout.batch_id;
      transaction.completedAt = new Date();
      await transaction.save();

      const chat = await Chat.findById(milestone.chat);
      if (chat.activeMilestone?.toString() === milestone._id.toString()) {
        chat.activeMilestone = null;
        await chat.save();
      }

      res.json({ milestone, transaction });
    } catch (payoutErr) {
      const transaction = await Transaction.findOne({ milestone: milestone._id });
      transaction.payoutStatus = 'failed';
      await transaction.save();

      res.status(500).json({ error: 'Payout failed', details: payoutErr.message });
    }
  } catch (err) {
    console.error('[Milestone Confirm Error]:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.post('/milestones/:id/refund', authMiddleware, verifiedOnly, async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id).populate('proposal');
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

    const proposal = milestone.proposal;
    if (proposal.buyer.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Only buyer can request refund' });

    if (milestone.status !== 'in_progress') return res.status(400).json({ error: 'Milestone not in progress or already paid' });

    milestone.status = 'refunded';
    await milestone.save();

    const transaction = await Transaction.findOne({ milestone: milestone._id });
    transaction.payoutStatus = 'refunded';
    await transaction.save();

    const chat = await Chat.findById(milestone.chat);
    if (chat.activeMilestone?.toString() === milestone._id.toString()) {
      chat.activeMilestone = null;
      await chat.save();
    }

    res.json({ milestone, transaction });
  } catch (err) {
    console.error('[Milestone Refund Error]:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
