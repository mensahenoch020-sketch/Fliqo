const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

router.post('/rate-alert', protect, async (req, res) => {
  try {
    const { cardType, targetRate } = req.body;
    if (!cardType || !targetRate) return res.status(400).json({ success:false, message:'cardType and targetRate required.' });
    const user = await User.findById(req.user._id);
    if (user.rateAlerts.filter(a=>a.isActive).length >= 10)
      return res.status(400).json({ success:false, message:'Max 10 active alerts.' });
    user.rateAlerts.push({ cardType, targetRate: parseInt(targetRate) });
    await user.save();
    res.json({ success:true, message:`Alert set for ${cardType} at ₦${parseInt(targetRate).toLocaleString()}` });
  } catch (e) { res.status(500).json({ success:false, message:'Server error.' }); }
});

router.delete('/rate-alert/:alertId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.rateAlerts = user.rateAlerts.filter(a => a._id.toString() !== req.params.alertId);
    await user.save();
    res.json({ success:true, message:'Alert removed.' });
  } catch (e) { res.status(500).json({ success:false, message:'Server error.' }); }
});

router.post('/kyc', protect, async (req, res) => {
  try {
    const { bvn, nin } = req.body;
    if (!bvn && !nin) return res.status(400).json({ success:false, message:'BVN or NIN required.' });
    const user = await User.findById(req.user._id);
    if (bvn) user.kyc.bvn = bvn;
    if (nin) user.kyc.nin = nin;
    user.kyc.status = 'submitted';
    await user.save();
    res.json({ success:true, message:'KYC submitted. Verification takes up to 24 hours.' });
  } catch (e) { res.status(500).json({ success:false, message:'Server error.' }); }
});

module.exports = router;
