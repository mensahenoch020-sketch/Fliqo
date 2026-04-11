const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const Trade = require('../models/Trade');
const Rate = require('../models/Rate');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Images only'), false);
  }
});

// POST /api/trades/submit
router.post('/submit', protect, upload.single('cardImage'), async (req, res) => {
  try {
    const { cardType, cardSubType, cardRegion, denomination, cardCode } = req.body;
    if (!cardType || !denomination)
      return res.status(400).json({ success: false, message: 'cardType and denomination required.' });

    const rateDoc = await Rate.findOne({ cardType, isActive: true });
    if (!rateDoc)
      return res.status(400).json({ success: false, message: 'Card type not supported.' });

    const ratePerDollar = cardSubType === 'ecode' ? rateDoc.rates.ecode : rateDoc.rates.physical;
    if (!ratePerDollar)
      return res.status(400).json({ success: false, message: 'Rate not available.' });

    const nairaAmount = Math.round(parseFloat(denomination) * ratePerDollar);

    // In production: upload req.file to Cloudinary and store the URL
    let cardImageUrl = null;
    if (req.file) {
      cardImageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    const trade = await Trade.create({
      user: req.user._id, cardType,
      cardSubType: cardSubType || 'physical',
      cardRegion: cardRegion || 'US',
      denomination: parseFloat(denomination),
      cardCode, cardImageUrl, ratePerDollar, nairaAmount, status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Trade submitted. Verifying your card now.',
      trade: { tradeId: trade.tradeId, cardType: trade.cardType, denomination: trade.denomination, nairaAmount: trade.nairaAmount, status: trade.status }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/trades/my
router.get('/my', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const trades = await Trade.find({ user: req.user._id })
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .select('-cardCode -cardImageUrl');
    const total = await Trade.countDocuments({ user: req.user._id });
    res.json({ success: true, trades, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/trades/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const trade = await Trade.findOne({
      $or: [{ _id: req.params.id }, { tradeId: req.params.id }],
      user: req.user._id
    });
    if (!trade) return res.status(404).json({ success: false, message: 'Trade not found.' });
    res.json({ success: true, trade });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/trades/:id/dispute
router.post('/:id/dispute', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const trade = await Trade.findOne({ tradeId: req.params.id, user: req.user._id });
    if (!trade) return res.status(404).json({ success: false, message: 'Trade not found.' });
    if (trade.status !== 'paid') return res.status(400).json({ success: false, message: 'Only paid trades can be disputed.' });
    trade.status = 'disputed';
    trade.adminNote = `User dispute: ${reason}`;
    await trade.save();
    res.json({ success: true, message: 'Dispute submitted. Team will review within 24 hours.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
