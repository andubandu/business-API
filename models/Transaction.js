const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  proposal: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', required: true },
  milestone: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone' },
  buyerID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  amountPaid: { type: Number, required: true },
  platformFee: { type: Number, required: true },
  sellerEarnings: { type: Number, required: true },
  currency: { type: String, default: 'USD' },

  paymentID: { type: String },

  payoutStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'refunded'],
    default: 'pending'
  },

  payoutID: { type: String },

  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

module.exports = mongoose.model('Transaction', transactionSchema);
