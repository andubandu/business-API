const express = require('express');
const { authMiddleware, verifiedOnly } = require('../middleware/auth');
const Chat = require('../models/Chat');
const Milestone = require('../models/Milestone');
const Proposal = require('../models/Proposal');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { processPayoutToSeller } = require('../utils/paypal');
const {
  notifyServicePurchase,
  notifyPayoutSent,
  notifyPayoutFailed,
  notifyRefund
} = require('../utils/notifications');
const router = express.Router();

function roundTwo(amount) {
  return Math.round(amount * 100) / 100;
}

router.post('/:chatId/new', authMiddleware, verifiedOnly, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { title, description, price, dueDate } = req.body;
    const chat = await Chat.findById(chatId).populate('proposal');
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    if (![chat.proposal.buyer.toString(), chat.proposal.seller.toString()].includes(req.user._id.toString())) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (chat.activeMilestone) return res.status(400).json({ error: 'Another milestone is already active' });

    const milestone = await Milestone.create({
      chat: chat._id,
      proposal: chat.proposal._id,
      title,
      description: description || '',
      price,
      dueDate: dueDate ? new Date(dueDate) : undefined
    });

    chat.milestones.push(milestone._id);
    chat.activeMilestone = milestone._id;
    await chat.save();

    res.status(201).json(milestone);
  } catch (err) {
    console.error('[Milestone Creation Error]:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.post('/:milestoneId/agree', authMiddleware, verifiedOnly, async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.milestoneId);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

    const proposal = await Proposal.findById(milestone.proposal);
    if (proposal.seller.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized' });

    milestone.sellerApproved = true;
    milestone.status = 'in_progress';
    await milestone.save();

    const chat = await Chat.findById(milestone.chat);
    chat.activeMilestone = milestone._id;
    await chat.save();

    res.json(milestone);
  } catch (err) {
    console.error('[Milestone Agree Error]:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.post('/:milestoneId/disagree', authMiddleware, verifiedOnly, async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.milestoneId);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

    const proposal = await Proposal.findById(milestone.proposal);
    if (proposal.seller.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized' });

    milestone.status = 'disagreed';
    await milestone.save();

    const chat = await Chat.findById(milestone.chat);
    if (chat.activeMilestone?.toString() === milestone._id.toString()) {
      chat.activeMilestone = null;
      await chat.save();
    }

    res.json(milestone);
  } catch (err) {
    console.error('[Milestone Disagree Error]:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});



module.exports = router;
