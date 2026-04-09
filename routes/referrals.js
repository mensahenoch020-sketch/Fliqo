const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

router.get('/my', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('referralCode referralEarnings referralCount');
    const referrals = await User.find({ referredBy: req.user._id }).select('fullName createdAt tradeCount').sort({ createdAt:-1 });
    res.json({
      success:true,
      referralCode: user.referralCode,
      referralLink: `https://fliqo.ng/ref/${user.referralCode}`,
      earnings: user.referralEarnings,
      count: user.referralCount,
      referrals
    });
  } catch (e) { res.status(500).json({ success:false, message:'Server error.' }); }
});

module.exports = router;
