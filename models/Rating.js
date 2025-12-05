const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  ratedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  ratedService: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: false },
  score: { type: Number, required: true, min: 1, max: 5 }
}, { timestamps: true });

ratingSchema.pre('validate', function (next) {
  if ((this.ratedUser && this.ratedService) || (!this.ratedUser && !this.ratedService)) {
    return next(new Error('Exactly one of ratedUser or ratedService must be set.'));
  }
  next();
});

ratingSchema.pre('save', async function (next) {
  const Rating = this.constructor;
  const filter = this.ratedUser ? { ratedUser: this.ratedUser } : { ratedService: this.ratedService };
  const id = this.ratedUser || this.ratedService;
  const model = this.ratedUser ? mongoose.model('User') : mongoose.model('Service');

  const ratings = await Rating.find(filter);
  const scores = ratings.map(r => r.score).filter(score => typeof score === 'number');

  const total = scores.reduce((acc, val) => acc + val, 0);
  const avg = scores.length > 0 ? total / scores.length : 0;

  await model.findByIdAndUpdate(id, {
    averageRating: avg,
    totalScore: scores
  });

  next();
});

module.exports = mongoose.model('Rating', ratingSchema);
