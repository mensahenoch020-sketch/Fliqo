const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName:     { type: String, required: true, trim: true },
  phone:        { type: String, required: true, unique: true, trim: true },
  email:        { type: String, trim: true, lowercase: true },
  password:     { type: String, required: true, minlength: 8 },
  walletBalance:{ type: Number, default: 0, min: 0 },
  totalEarned:  { type: Number, default: 0 },
  kyc: {
    status:    { type: String, enum: ['pending','submitted','verified','rejected'], default: 'pending' },
    bvn:       String,
    nin:       String,
    selfieUrl: String,
    verifiedAt:Date
  },
  referralCode:     { type: String, unique: true },
  referredBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralEarnings: { type: Number, default: 0 },
  referralCount:    { type: Number, default: 0 },
  bankAccounts: [{
    bankName:     String,
    bankCode:     String,
    accountNumber:String,
    accountName:  String,
    isPrimary:    { type: Boolean, default: false }
  }],
  rateAlerts: [{
    cardType:   String,
    targetRate: Number,
    isActive:   { type: Boolean, default: true },
    createdAt:  { type: Date, default: Date.now }
  }],
  tradeCount:  { type: Number, default: 0 },
  totalTraded: { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
  isVerified:  { type: Boolean, default: false },
  role:        { type: String, enum: ['user','admin'], default: 'user' },
  lastLogin:   Date,
  otp:         String,
  otpExpires:  Date,
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = 'FLQ' + Math.random().toString(36).substr(2,6).toUpperCase();
  }
  next();
});

userSchema.methods.comparePassword = function(pwd) {
  return bcrypt.compare(pwd, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password; delete obj.otp; delete obj.otpExpires;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
