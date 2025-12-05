const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
proposal: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', required: true },
  title: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'paid', 'refunded'],
    default: 'pending'
  },
  dueDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  buyerPaid: { type: Boolean, default: false },
  sellerApproved: { type: Boolean, default: false },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    paidToSeller: { type: Boolean, default: false }
});

module.exports = mongoose.model('Milestone', milestoneSchema);
