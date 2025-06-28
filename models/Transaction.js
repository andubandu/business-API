const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  serviceID: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  buyerID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amountPaid: { type: Number, required: true },
  currency: { type: String, required: true },
  platformEarnings: { type: Number, required: true },
  developerEarnings: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);