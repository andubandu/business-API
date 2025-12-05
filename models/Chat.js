const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  proposal: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  updatedAt: { type: Date, default: Date.now },
  milestones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Milestone' }],
  activeMilestone: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone', default: null }
});


chatSchema.index({ proposal: 1 }, { unique: true });

module.exports = mongoose.model('Chat', chatSchema);
