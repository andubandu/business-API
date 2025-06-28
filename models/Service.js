const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: String,
  tags: [String]
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);