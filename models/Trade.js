const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  tradeId:       { type: String, unique: true },
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cardType:      { type: String, required: true },
  cardSubType:   String,
  cardRegion:    String,
  denomination:  { type: Number, required: true },
  cardCode:      String,
  cardImageUrl:  String,
  ratePerDollar: { type: Number, required: true },
  nairaAmount:   { type: Number, required: true },
  status: { type: String, enum: ['pending','verifying','approved','rejected','paid','disputed'], default: 'pending' },
  reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:   Date,
  adminNote:    String,
  rejectReason: String,
  paidAt:       Date,
  paymentRef:   String,
  completedAt:  Date,
  processingTime: Number,
  receiptId:    String,
}, { timestamps: true });

tradeSchema.pre('save', function(next) {
  if (!this.tradeId)   this.tradeId   = 'FLQ-' + Math.floor(10000 + Math.random() * 90000);
  if (!this.receiptId) this.receiptId = Math.floor(10000 + Math.random() * 90000).toString();
  next();
});

module.exports = mongoose.model('Trade', tradeSchema);
