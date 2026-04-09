const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const signToken = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });

const sendOTP = async (phone, otp) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📱 OTP for ${phone}: ${otp}`);
    return true;
  }
  try {
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      body: `Your Fliqo code: ${otp}. Valid 10 mins. Do not share.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
    return true;
  } catch (e) { console.error('SMS error:', e); return false; }
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { fullName, phone, password, referralCode } = req.body;
    if (!fullName || !phone || !password)
      return res.status(400).json({ success: false, message: 'All fields required.' });
    if (password.length < 8)
      return res.status(400).json({ success: false, message: 'Password min 8 characters.' });
    if (await User.findOne({ phone }))
      return res.status(409).json({ success: false, message: 'Phone already registered.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    let referredBy = null;
    if (referralCode) {
      const ref = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (ref) referredBy = ref._id;
    }

    const user = await User.create({ fullName, phone, password, otp, otpExpires, isVerified: false, referredBy });
    await sendOTP(phone, otp);

    res.status(201).json({ success: true, message: 'Account created. Check your phone for OTP.', userId: user._id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.isVerified) return res.status(400).json({ success: false, message: 'Already verified.' });
    if (user.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    if (user.otpExpires < Date.now()) return res.status(400).json({ success: false, message: 'OTP expired.' });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;

    if (user.referredBy) {
      const referrer = await User.findById(user.referredBy);
      if (referrer) {
        referrer.referralEarnings += 500;
        referrer.walletBalance   += 500;
        referrer.referralCount   += 1;
        await referrer.save();
      }
    }
    await user.save();

    res.json({ success: true, token: signToken(user._id), user });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ success: false, message: 'Phone and password required.' });
    const user = await User.findOne({ phone }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid phone or password.' });
    if (!user.isVerified)
      return res.status(403).json({ success: false, message: 'Phone not verified. Check your OTP.' });
    user.lastLogin = new Date();
    await user.save();
    res.json({ success: true, token: signToken(user._id), user });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await sendOTP(user.phone, otp);
    res.json({ success: true, message: 'OTP resent.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json({ success: true, user: req.user }));

module.exports = router;
