const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Trade = require('../models/Trade');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

router.use(protect, adminOnly);

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const [totalUsers, totalTrades, pendingTrades, todayTrades, paidOut] = await Promise.all([
      User.countDocuments({ role:'user' }),
      Trade.countDocuments(),
      Trade.countDocuments({ status:'pending' }),
      Trade.countDocuments({ createdAt: { $gte: today } }),
      Transaction.aggregate([{ $match:{ type:'credit', category:'trade' } }, { $group:{ _id:null, total:{ $sum:'$amount' } } }])
    ]);
    res.json({ success:true, stats:{ totalUsers, totalTrades, pendingTrades, todayTrades, totalPaidOut: paidOut[0]?.total||0 } });
  } catch (e) { res.status(500).json({ success:false, message:'Server error.' }); }
});

// GET /api/admin/trades
router.get('/trades', async (req, res) => {
  try {
    const { status, page=1, limit=30 } = req.query;
    const filter = status ? { status } : {};
    const trades = await Trade.find(filter).populate('user','fullName phone walletBalance')
      .sort({ createdAt:-1 }).skip((page-1)*limit).limit(parseInt(limit));
    const total = await Trade.countDocuments(filter);
    res.json({ success:true, trades, total });
  } catch (e) { res.status(500).json({ success:false, message:'Server error.' }); }
});

// PUT /api/admin/trades/:id/approve
router.put('/trades/:id/approve', async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id).populate('user');
    if (!trade) return res.status(404).json({ success:false, message:'Trade not found.' });
    if (!['pending','verifying'].includes(trade.status))
      return res.status(400).json({ success:false, message:`Cannot approve status: ${trade.status}` });

    const user = await User.findById(trade.user._id);
    const balanceBefore = user.walletBalance;
    user.walletBalance += trade.nairaAmount;
    user.totalEarned   += trade.nairaAmount;
    user.tradeCount    += 1;
    user.totalTraded   += trade.denomination;
    await user.save();

    trade.status = 'paid';
    trade.reviewedBy = req.user._id;
    trade.reviewedAt = new Date();
    trade.paidAt     = new Date();
    trade.completedAt = new Date();
    trade.processingTime = Math.round((Date.now() - trade.createdAt) / 1000);
    await trade.save();

    await Transaction.create({
      user: user._id, type:'credit', category:'trade',
      amount: trade.nairaAmount, balanceBefore, balanceAfter: user.walletBalance,
      description: `${trade.cardType} $${trade.denomination} trade`,
      reference: trade.tradeId, status:'completed'
    });

    res.json({ success:true, message:'Trade approved. Wallet credited.', trade });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false, message:'Server error.' });
  }
});

// PUT /api/admin/trades/:id/reject
router.put('/trades/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success:false, message:'Reject reason required.' });
    const trade = await Trade.findByIdAndUpdate(req.params.id,
      { status:'rejected', rejectReason:reason, reviewedBy:req.user._id, reviewedAt:new Date() },
      { new:true }
    );
    if (!trade) return res.status(404).json({ success:false, message:'Trade not found.' });
    res.json({ success:true, message:'Trade rejected.', trade });
  } catch (e) { res.status(500).json({ success:false, message:'Server error.' }); }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { page=1, limit=30, search } = req.query;
    const filter = search ? { $or:[{ fullName:new RegExp(search,'i') },{ phone:new RegExp(search,'i') }] } : {};
    const users = await User.find(filter).sort({ createdAt:-1 }).skip((page-1)*limit).limit(parseInt(limit)).select('-password');
    const total = await User.countDocuments(filter);
    res.json({ success:true, users, total });
  } catch (e) { res.status(500).json({ success:false, message:'Server error.' }); }
});

// PUT /api/admin/users/:id/toggle
router.put('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success:false, message:'User not found.' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success:true, message:`User ${user.isActive ? 'activated' : 'deactivated'}.` });
  } catch (e) { res.status(500).json({ success:false, message:'Server error.' }); }
});

module.exports = router;
