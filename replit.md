# Cigna Group - Investment Platform

## Project Overview
Cigna Group is a comprehensive investment platform designed for 5 French-speaking African countries: Cameroun, Burkina Faso, Togo, Bénin, and Côte d'Ivoire. Users can invest in VIP products that generate daily returns over 100 days, with a 3-level referral system for earning commissions.

## Tech Stack
- **Frontend**: React with TypeScript, Vite, TailwindCSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based with bcrypt password hashing
- **State Management**: TanStack Query for server state

## Key Features
- Custom phone-based authentication (no Replit Auth)
- 6 VIP investment products with tiered daily returns
- 3-level referral system (25%/2%/1% commissions)
- Task rewards for purchases and referrals
- Deposit/Withdrawal management with admin approval
- Full admin dashboard for platform management

## Business Rules
- **Signup Bonus**: 500 FCFA for new users
- **Minimum Deposit**: 3,000 FCFA
- **Minimum Withdrawal**: 1,200 FCFA
- **Withdrawal Fee**: 15%
- **Withdrawal Limit**: 1 per day
- **Withdrawal Hours**: 8h-17h (9h-18h for Cameroon/Benin)
- **Withdrawal Requirements**: User must have made a deposit AND purchased a VIP product

## VIP Products
| Level | Price | Daily Return | Total (100 days) |
|-------|-------|--------------|------------------|
| VIP 1 | 3,000 | 350 | 35,000 |
| VIP 2 | 5,000 | 600 | 60,000 |
| VIP 3 | 10,000 | 1,200 | 120,000 |
| VIP 4 | 20,000 | 2,500 | 250,000 |
| VIP 5 | 50,000 | 6,000 | 600,000 |
| VIP 6 | 100,000 | 15,000 | 1,500,000 |

## Default Admin Account
- **Country**: Togo (TG)
- **Phone**: 99935673
- **Password**: AAbb11##

## Project Structure
```
├── client/src/
│   ├── App.tsx           # Main app with routing
│   ├── lib/auth.tsx      # Auth context provider
│   ├── components/       # Reusable UI components
│   └── pages/
│       ├── auth/         # Login, Register
│       ├── home.tsx      # Dashboard
│       ├── tasks.tsx     # Task rewards
│       ├── invest.tsx    # VIP products
│       ├── team.tsx      # Referral stats
│       ├── account.tsx   # User profile
│       ├── deposit.tsx   # Make deposits
│       ├── withdraw.tsx  # Request withdrawals
│       ├── wallets.tsx   # Manage payment wallets
│       ├── history.tsx   # Transaction history
│       └── admin/        # Admin dashboard pages
├── server/
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database operations
│   └── db.ts             # Database connection
└── shared/
    └── schema.ts         # Drizzle schemas, types, constants
```

## API Endpoints
### Auth
- POST /api/auth/register - User registration
- POST /api/auth/login - User login
- POST /api/auth/logout - User logout
- GET /api/auth/me - Get current user

### User
- GET /api/products - Get VIP products with ownership status
- POST /api/products/purchase - Buy a VIP product
- GET /api/wallets - Get user wallets
- POST /api/wallets - Create wallet
- DELETE /api/wallets/:id - Delete wallet
- POST /api/deposits - Request deposit
- POST /api/withdrawals - Request withdrawal
- GET /api/transactions/history - Get transaction history
- GET /api/tasks/status - Get task completion status
- POST /api/tasks/claim - Claim task reward
- GET /api/team/stats - Get referral statistics

### Admin
- GET /api/admin/dashboard - Dashboard statistics
- GET /api/admin/deposits - List deposits
- POST /api/admin/deposits/:id/approve - Approve deposit
- POST /api/admin/deposits/:id/reject - Reject deposit
- GET /api/admin/withdrawals - List withdrawals
- POST /api/admin/withdrawals/:id/approve - Approve withdrawal
- POST /api/admin/withdrawals/:id/reject - Reject withdrawal
- GET /api/admin/users - List all users
- PATCH /api/admin/users/:id - Update user
- POST /api/admin/users/:id/products - Assign/remove products
- GET/POST/PATCH/DELETE /api/admin/payment-channels - Manage payment channels
- GET/PATCH /api/admin/settings - Platform settings

## Payment Methods by Country
- **Togo**: Moov Money, Mixx by Yas
- **Côte d'Ivoire**: Wave, MTN, Orange Money, Moov Money
- **Bénin**: Celtis, Moov Money, MTN, Momo
- **Cameroun**: Orange Money, MTN
- **Burkina Faso**: Orange Money, Moov Money

## Daily Payouts
The system runs a background job every 60 seconds that:
1. Checks all active user products
2. If 24 hours have passed since last payout
3. Credits daily return to user balance
4. Increments cycle count (max 100 days)
5. Records earning in transaction history

## Development Commands
- `npm run dev` - Start development server
- `npm run db:push` - Push schema changes to database
