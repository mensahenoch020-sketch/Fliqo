# Fliqo 🟢
**Nigeria's fastest gift card trading app**

Trade Amazon, iTunes, Steam, Google Play, Xbox, Target, Uber and 20+ gift cards for Naira in under 60 seconds.

---

## Project Structure

```
fliqo/
├── frontend/
│   ├── fliqo-app.html              ← Main app (onboarding + dashboard + wallet)
│   └── assets/
│       └── cards/                  ← Add your gift card images here
│           ├── amazon.jpg
│           ├── itunes.jpg
│           ├── steam.jpg
│           ├── google-play.jpg
│           ├── xbox.jpg
│           ├── playstation.jpg
│           ├── target.jpg
│           ├── walmart.jpg
│           ├── uber.jpg
│           ├── nike.jpg
│           ├── sephora.jpg
│           ├── nordstrom.jpg
│           ├── razer.jpg
│           ├── ebay.jpg
│           ├── bestbuy.jpg
│           ├── footlocker.jpg
│           └── amex.jpg
│
└── backend/
    ├── server.js
    ├── package.json
    ├── railway.json
    ├── .env.example
    ├── models/
    │   ├── User.js
    │   ├── Trade.js
    │   ├── Transaction.js
    │   └── Rate.js
    ├── middleware/
    │   └── auth.js
    └── routes/
        ├── auth.js
        ├── trades.js
        ├── wallet.js
        ├── rates.js
        ├── cards.js
        ├── referrals.js
        └── admin.js
```

---

## Gift Card Images

Download each image from Google Images and save to `frontend/assets/cards/`:

| Filename | Search term |
|----------|-------------|
| `amazon.jpg` | Amazon gift card |
| `itunes.jpg` | iTunes gift card |
| `steam.jpg` | Steam gift card |
| `google-play.jpg` | Google Play gift card |
| `xbox.jpg` | Xbox gift card |
| `playstation.jpg` | PlayStation gift card |
| `target.jpg` | Target gift card |
| `walmart.jpg` | Walmart gift card |
| `uber.jpg` | Uber gift card |
| `nike.jpg` | Nike gift card |
| `sephora.jpg` | Sephora gift card |
| `nordstrom.jpg` | Nordstrom gift card |
| `razer.jpg` | Razer Gold gift card |
| `ebay.jpg` | eBay gift card |
| `bestbuy.jpg` | Best Buy gift card |
| `footlocker.jpg` | Foot Locker gift card |
| `amex.jpg` | American Express gift card |

> Cards show a colored gradient fallback if images are missing — so the app still looks good without them.

---

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in your MongoDB, Flutterwave, and Twilio keys
npm run dev
```

API runs on **http://localhost:5000**

### Seed card rates (run once after first deploy)
```
POST /api/rates/seed
Authorization: Bearer YOUR_ADMIN_TOKEN
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create account, sends OTP |
| POST | /api/auth/verify-otp | Verify OTP, returns JWT token |
| POST | /api/auth/login | Login, returns JWT token |
| POST | /api/auth/resend-otp | Resend OTP |
| GET  | /api/auth/me | Get current user (auth required) |

### Trades
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/trades/submit | Submit gift card trade |
| GET  | /api/trades/my | User trade history |
| GET  | /api/trades/:id | Single trade details |
| POST | /api/trades/:id/dispute | Dispute a trade |

### Wallet
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/wallet/balance | Get wallet balance |
| GET  | /api/wallet/transactions | Transaction history |
| GET  | /api/wallet/banks | List Nigerian banks |
| POST | /api/wallet/add-bank | Add bank account |
| DELETE | /api/wallet/bank/:id | Remove bank account |
| POST | /api/wallet/withdraw | Withdraw to bank (Flutterwave) |

### Rates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/rates | All live rates (public) |
| GET  | /api/rates/calculate | Calculate payout amount |
| PUT  | /api/rates/:id | Update rate (admin only) |
| POST | /api/rates/seed | Seed default rates (admin only) |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/admin/dashboard | Stats overview |
| GET  | /api/admin/trades | All trades with filters |
| PUT  | /api/admin/trades/:id/approve | Approve trade → credits wallet |
| PUT  | /api/admin/trades/:id/reject | Reject trade |
| GET  | /api/admin/users | All users |
| PUT  | /api/admin/users/:id/toggle | Activate/deactivate user |

---

## Deploy to Railway

1. Push this repo to GitHub
2. Go to **railway.app** → New Project → Deploy from GitHub repo
3. Select the **backend** folder as root directory
4. Add environment variables (copy from `.env.example`)
5. Deploy — Railway auto-detects Node.js via NIXPACKS

**Frontend:** Host `frontend/` as a static site on Railway, Vercel, or Netlify.

---

## Environment Variables

| Variable | What it is |
|----------|-----------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for JWT tokens (make it long and random) |
| `FLW_SECRET_KEY` | Flutterwave secret key (for bank payouts) |
| `TWILIO_ACCOUNT_SID` | Twilio account SID (for OTP SMS) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number |
| `FRONTEND_URL` | Your frontend domain (for CORS) |

---

Built for Nigeria 🇳🇬
