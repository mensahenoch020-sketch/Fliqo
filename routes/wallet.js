const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// GET /api/wallet/balance
router.get('/balance', protect, async (req, res) => {
  const user = await User.findById(req.user._id).select('walletBalance totalEarned referralEarnings tradeCount');
  res.json({ success: true, wallet: user });
});

// GET /api/wallet/transactions
router.get('/transactions', protect, async (req, res) => {
  try {
    const { page=1, limit=30, category } = req.query;
    const filter = { user: req.user._id };
    if (category) filter.category = category;
    const txs = await Transaction.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(parseInt(limit));
    const total = await Transaction.countDocuments(filter);
    res.json({ success: true, transactions: txs, total });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// GET /api/wallet/banks
router.get('/banks', protect, async (req, res) => {
  const banks = [
    { name:'GTBank',      code:'058' },{ name:'Access Bank', code:'044' },
    { name:'First Bank',  code:'011' },{ name:'UBA',         code:'033' },
    { name:'Zenith Bank', code:'057' },{ name:'Fidelity Bank',code:'070' },
    { name:'Opay',        code:'999992'},{ name:'Palmpay',   code:'999991'},
    { name:'Kuda Bank',   code:'090267'},{ name:'Moniepoint', code:'090405'},
    { name:'Wema Bank',   code:'035' },{ name:'Union Bank',  code:'032' },
    { name:'Polaris Bank',code:'076' },{ name:'Sterling Bank',code:'232'},
  ];
  res.json({ success: true, banks });
});

// POST /api/wallet/add-bank
router.post('/add-bank', protect, async (req, res) => {
  try {
    const { bankName, bankCode, accountNumber, accountName, isPrimary } = req.body;
    if (!bankName || !bankCode || !accountNumber || !accountName)
      return res.status(400).json({ success: false, message: 'All bank fields required.' });
    const user = await User.findById(req.user._id);
    if (isPrimary) user.bankAccounts.forEach(b => b.isPrimary = false);
    user.bankAccounts.push({ bankName, bankCode, accountNumber, accountName, isPrimary: !!isPrimary || user.bankAccounts.length === 0 });
    await user.save();
    res.json({ success: true, message: 'Bank account added.', bankAccounts: user.bankAccounts });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// DELETE /api/wallet/bank/:id
router.delete('/bank/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.bankAccounts = user.bankAccounts.filter(b => b._id.toString() !== req.params.id);
    await user.save();
    res.json({ success: true, message: 'Bank account removed.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST /api/wallet/withdraw
router.post('/withdraw', protect, async (req, res) => {
  try {
    const { amount, bankAccountId } = req.body;
    const withdrawAmount = parseInt(amount);
    if (!withdrawAmount || withdrawAmount < 1000)
      return res.status(400).json({ success: false, message: 'Minimum withdrawal is ₦1,000.' });

    const user = await User.findById(req.user._id);
    if (user.walletBalance < withdrawAmount)
      return res.status(400).json({ success: false, message: 'Insufficient balance.' });

    const bank = bankAccountId
      ? user.bankAccounts.id(bankAccountId)
      : user.bankAccounts.find(b => b.isPrimary);
    if (!bank) return res.status(400).json({ success: false, message: 'No bank account found. Add one first.' });

    const balanceBefore = user.walletBalance;
    user.walletBalance -= withdrawAmount;
    await user.save();

    const txRef = `FLQ-W-${Date.now()}`;
    await Transaction.create({
      user: user._id, type: 'debit', category: 'withdrawal',
      amount: withdrawAmount, balanceBefore, balanceAfter: user.walletBalance,
      description: `Withdrawal to ${bank.bankName} ****${bank.accountNumber.slice(-4)}`,
      reference: txRef, status: 'pending'
    });

    // Flutterwave payout
    if (process.env.FLW_SECRET_KEY && process.env.FLW_SECRET_KEY !== 'FLWSECK_TEST-your_key') {
      try {
        await axios.post('https://api.flutterwave.com/v3/transfers', {
          account_bank: bank.bankCode, account_number: bank.accountNumber,
          amount: withdrawAmount, narration: `Fliqo - ${user.fullName}`,
          currency: 'NGN', reference: txRef,
          callback_url: `${process.env.BASE_URL}/api/wallet/withdrawal-callback`,
          debit_currency: 'NGN'
        }, { headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` } });
      } catch (flwErr) {
        // Refund on failure
        user.walletBalance += withdrawAmount;
        await user.save();
        console.error('FLW Error:', flwErr?.response?.data);
        return res.status(500).json({ success: false, message: 'Payout failed. Balance restored.' });
      }
    } else {
      console.log(`[DEV] Withdrawal of ₦${withdrawAmount} to ${bank.bankName} - ${bank.accountNumber}`);
    }

    res.json({
      success: true,
      message: 'Withdrawal initiated. Funds arrive within 60 seconds.',
      reference: txRef, amount: withdrawAmount,
      bank: `${bank.bankName} ****${bank.accountNumber.slice(-4)}`
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/wallet/withdrawal-callback (Flutterwave webhook)
router.post('/withdrawal-callback', async (req, res) => {
  console.log('FLW Webhook:', req.body);
  res.sendStatus(200);
});

module.exports = router;
