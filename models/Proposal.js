const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  price: { type: Number },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' }
});

module.exports = mongoose.model('Proposal', proposalSchema);
