const mongoose = require('mongoose');

const txSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:          { type: String, enum: ['credit','debit'], required: true },
  category:      { type: String, enum: ['trade','withdrawal','referral','bonus','reversal'], required: true },
  amount:        { type: Number, required: true },
  balanceBefore: Number,
  balanceAfter:  Number,
  description:   String,
  reference:     String,
  status:        { type: String, enum: ['pending','completed','failed'], default: 'completed' },
  meta:          mongoose.Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model('Transaction', txSchema);
