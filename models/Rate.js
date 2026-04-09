const mongoose = require('mongoose');

const rateSchema = new mongoose.Schema({
  cardType:    { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  category:    { type: String, enum: ['gaming','shopping','music','other'], default: 'shopping' },
  imageUrl:    String,
  rates: {
    physical: { type: Number, default: 0 },
    ecode:    { type: Number, default: 0 },
  },
  regions:    [String],
  isActive:   { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  sortOrder:  { type: Number, default: 0 },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Rate', rateSchema);
