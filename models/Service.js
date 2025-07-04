const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { 
    type: String, 
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'], 
    default: 'USD' 
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: String,
  tags: [String],

  averageRating: { type: Number, default: 0 },
  totalScore: { type: [Number], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
