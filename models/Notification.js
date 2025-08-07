const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  type: { 
    type: String, 
    enum: ['purchase', 'verification_approved', 'verification_rejected', 'payout_sent', 'payout_failed', 'system'], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: {
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    amount: Number,
    currency: String,
    payoutId: String,
    buyerName: String,
    buyerUsername: String
  },
  read: { type: Boolean, default: false },
  readAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);