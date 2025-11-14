const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  proposal: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', required: true },
  title: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed', 'paid'], 
    default: 'pending' 
  },
  dueDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Milestone', milestoneSchema);
