const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  type: { type: String, enum: ['text', 'milestone'], default: 'text' },
  milestone: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone' },
  sentAt: { type: Date, default: Date.now },

  deliveredAt: { type: Date },
  readAt: { type: Date }
});

module.exports = mongoose.model('Message', messageSchema);
