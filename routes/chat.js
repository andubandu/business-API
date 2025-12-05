const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Proposal = require('../models/Proposal');
const router = express.Router();

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate({ path: 'participants', select: '-password -__v' })
      .populate({ path: 'lastMessage', select: '-__v', populate: { path: 'sender', select: '-password -__v' } })
      .sort({ updatedAt: -1 });
    res.json(chats);
  } catch (err) {
    console.error('[Fetch Chats Error]:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.post('/start/:proposalId', authMiddleware, async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.proposalId);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

    if (![proposal.buyer.toString(), proposal.seller.toString()].includes(req.user._id.toString())) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    let chat = await Chat.findOne({ proposal: proposal._id });
    if (!chat) {
      chat = await Chat.create({ proposal: proposal._id, participants: [proposal.buyer, proposal.seller] });
    }

    res.json(chat);
  } catch (err) {
    console.error('[Chat Start Error]:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.post('/:chatId/message', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const { chatId } = req.params;
    if (!content) return res.status(400).json({ error: 'Message content is required' });

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    if (!chat.participants.map(p => p.toString()).includes(req.user._id.toString())) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const msg = await Message.create({ chat: chatId, sender: req.user._id, content });
    const populatedMessage = await msg.populate('sender', 'username real_name profile_image');

    chat.lastMessage = msg._id;
    chat.updatedAt = new Date();
    await chat.save();

    const io = req.app.get('io');
    io.of('/chat').to(chatId).emit('new_message', populatedMessage);

    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error('[Send Message Error]:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.get('/:chatId/messages', authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    if (!chat.participants.map(p => p.toString()).includes(req.user._id.toString())) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const messages = await Message.find({ chat: chat._id })
      .populate('sender', 'username profile_image real_name')
      .sort({ sentAt: 1 });

    res.json({ userId: req.user._id, messages });
  } catch (err) {
    console.error('[Fetch Messages Error]:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.post('/:chatId/read', authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    if (!chat.participants.map(p => p.toString()).includes(req.user._id.toString())) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Message.updateMany(
      { chat: chat._id, sender: { $ne: req.user._id }, readAt: { $exists: false } },
      { readAt: new Date() }
    );

    const io = req.app.get('io');
    io.to(chat._id.toString()).emit('messages_read', { chatId: chat._id });

    res.json({ success: true });
  } catch (err) {
    console.error('[Mark Read Error]:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:chatId/delivered/:messageId', authMiddleware, async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    if (!chat.participants.map(p => p.toString()).includes(req.user._id.toString())) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const msg = await Message.findByIdAndUpdate(messageId, { deliveredAt: new Date() }, { new: true });
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const io = req.app.get('io');
    io.to(chatId).emit('message_delivered', { messageId });

    res.json({ success: true });
  } catch (err) {
    console.error('[Delivered ACK Error]:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:chatId/typing', authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    if (!chat.participants.map(p => p.toString()).includes(req.user._id.toString())) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const io = req.app.get('io');
    io.to(chat._id.toString()).emit('typing', { userId: req.user._id, isTyping: req.body.isTyping || false });

    res.json({ success: true });
  } catch (err) {
    console.error('[Typing Error]:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
