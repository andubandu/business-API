const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: function() { return this.type === 'offering'; } },
  currency: {
    type: String,
    enum: ['USD', 'EUR'],
    default: 'USD'
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: String,
  tags: [String],
  type: {
    type: String,
    enum: ['request', 'offering'],
    required: true
  },
image_url: { type: String, default: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/330px-Placeholder_view_vector.svg.png' },
  promoted: { type: Boolean, default: false },
  promoted_at: { type: Date },
  averageRating: { type: Number, default: 0 },
  totalScore: { type: [Number], default: [] },
  proposals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' }]
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
