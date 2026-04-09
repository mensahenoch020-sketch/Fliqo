const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Rate = require('../models/Rate');

// GET /api/rates  (public)
router.get('/', async (req, res) => {
  try {
    const rates = await Rate.find({ isActive: true }).sort({ isFeatured: -1, sortOrder: 1 }).select('-lastUpdatedBy');
    res.json({ success: true, rates, updatedAt: new Date() });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// GET /api/rates/calculate?cardType=Amazon&denomination=100&subType=physical
router.get('/calculate', async (req, res) => {
  try {
    const { cardType, denomination, subType } = req.query;
    if (!cardType || !denomination) return res.status(400).json({ success: false, message: 'cardType and denomination required.' });
    const rate = await Rate.findOne({ cardType, isActive: true });
    if (!rate) return res.status(404).json({ success: false, message: 'Card not found.' });
    const ratePerDollar = subType === 'ecode' ? rate.rates.ecode : rate.rates.physical;
    const nairaAmount = Math.round(parseFloat(denomination) * ratePerDollar);
    res.json({ success: true, cardType, denomination: parseFloat(denomination), ratePerDollar, nairaAmount });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT /api/rates/:id  (admin)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const rate = await Rate.findByIdAndUpdate(req.params.id, { ...req.body, lastUpdatedBy: req.user._id }, { new: true });
    if (!rate) return res.status(404).json({ success: false, message: 'Rate not found.' });
    res.json({ success: true, rate });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST /api/rates/seed  (admin, dev)
router.post('/seed', protect, adminOnly, async (req, res) => {
  try {
    const defaults = [
      { cardType:'Amazon',      displayName:'Amazon US',          category:'shopping', rates:{physical:885,ecode:870}, regions:['US','UK','CA'], isFeatured:true,  sortOrder:1  },
      { cardType:'iTunes',      displayName:'iTunes / Apple',     category:'music',    rates:{physical:820,ecode:800}, regions:['US','UK','CA'], isFeatured:true,  sortOrder:2  },
      { cardType:'Steam',       displayName:'Steam',              category:'gaming',   rates:{physical:790,ecode:775}, regions:['US','UK'],      isFeatured:true,  sortOrder:3  },
      { cardType:'GooglePlay',  displayName:'Google Play',        category:'gaming',   rates:{physical:790,ecode:780}, regions:['US','UK'],      isFeatured:false, sortOrder:4  },
      { cardType:'Xbox',        displayName:'Xbox',               category:'gaming',   rates:{physical:810,ecode:795}, regions:['US','UK'],      isFeatured:true,  sortOrder:5  },
      { cardType:'PlayStation', displayName:'PlayStation',        category:'gaming',   rates:{physical:800,ecode:785}, regions:['US','UK'],      isFeatured:false, sortOrder:6  },
      { cardType:'Target',      displayName:'Target',             category:'shopping', rates:{physical:770,ecode:760}, regions:['US'],           isFeatured:false, sortOrder:7  },
      { cardType:'Walmart',     displayName:'Walmart',            category:'shopping', rates:{physical:760,ecode:750}, regions:['US'],           isFeatured:false, sortOrder:8  },
      { cardType:'Sephora',     displayName:'Sephora',            category:'shopping', rates:{physical:760,ecode:745}, regions:['US'],           isFeatured:false, sortOrder:9  },
      { cardType:'Nordstrom',   displayName:'Nordstrom',          category:'shopping', rates:{physical:730,ecode:720}, regions:['US'],           isFeatured:false, sortOrder:10 },
      { cardType:'Nike',        displayName:'Nike',               category:'shopping', rates:{physical:740,ecode:730}, regions:['US'],           isFeatured:false, sortOrder:11 },
      { cardType:'Uber',        displayName:'Uber',               category:'other',    rates:{physical:750,ecode:740}, regions:['US'],           isFeatured:false, sortOrder:12 },
      { cardType:'RazerGold',   displayName:'Razer Gold',         category:'gaming',   rates:{physical:740,ecode:730}, regions:['US'],           isFeatured:false, sortOrder:13 },
      { cardType:'eBay',        displayName:'eBay',               category:'shopping', rates:{physical:720,ecode:710}, regions:['US'],           isFeatured:false, sortOrder:14 },
      { cardType:'BestBuy',     displayName:'Best Buy',           category:'shopping', rates:{physical:700,ecode:690}, regions:['US'],           isFeatured:false, sortOrder:15 },
      { cardType:'FootLocker',  displayName:'Foot Locker',        category:'shopping', rates:{physical:710,ecode:700}, regions:['US'],           isFeatured:false, sortOrder:16 },
      { cardType:'Amex',        displayName:'American Express',   category:'other',    rates:{physical:750,ecode:740}, regions:['US'],           isFeatured:false, sortOrder:17 },
    ];
    await Rate.deleteMany({});
    await Rate.insertMany(defaults);
    res.json({ success: true, message: `${defaults.length} rates seeded.` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
