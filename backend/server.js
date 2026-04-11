const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/trades',    require('./routes/trades'));
app.use('/api/wallet',    require('./routes/wallet'));
app.use('/api/rates',     require('./routes/rates'));
app.use('/api/cards',     require('./routes/cards'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/admin',     require('./routes/admin'));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Fliqo API running on port ${PORT}`));
module.exports = app;
