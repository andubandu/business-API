const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Proposal = require('../models/Proposal');

const router = express.Router();
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate({
        path: 'participants',
        select: '-password -__v', 
      })
      .populate({
        path: 'lastMessage',
        select: '-__v',
        populate: { path: 'sender', select: '-password -__v' },
      })
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    console.error('[Fetch Chats Error]:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.post('/start/:proposalId', authMiddleware, async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.proposalId);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

    if (
      proposal.buyer.toString() !== req.user._id.toString() &&
      proposal.seller.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    let chat = await Chat.findOne({ proposal: proposal._id });
    if (!chat) {
      chat = await Chat.create({
        proposal: proposal._id,
        participants: [proposal.buyer, proposal.seller]
      });
    }

    res.json(chat);
  } catch (error) {
    console.error('[Chat Start Error]:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.post('/:chatId/message', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Message content is required' });

    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const message = await Message.create({
      chat: chat._id,
      sender: req.user._id,
      content
    });

    chat.lastMessage = message._id;
    chat.updatedAt = new Date();
    await chat.save();

    res.status(201).json(message);
  } catch (error) {
    console.error('[Send Message Error]:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.get('/:chatId/messages', authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const messages = await Message.find({ chat: chat._id })
      .populate('sender', 'username profile_image')
      .sort({ sentAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('[Fetch Messages Error]:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;
