# LunchFlow — School Lunch Distribution System

## Project Overview

LunchFlow is a web-based school lunch ordering and distribution system. Parents order and pay for their child's monthly lunch online, receive a QR code, and students present the QR code at the canteen for staff to scan and fulfil.

## Core User Flows

### 1. Parent Flow
1. Visit ordering portal → enter child details
2. Browse monthly menu (3–4 items)
3. Select one item for the month
4. Pay via KPay
5. Receive email/WhatsApp confirmation + monthly QR code
6. Child presents QR code at canteen each lunch day

### 2. Staff (Scanner) Flow
1. Open scanner screen on tablet/phone
2. Scan student's QR code
3. Student's name, class, and meal choice is displayed instantly
4. Staff taps "Collected" to mark pickup
5. Record syncs to Google Sheets

### 3. Admin Flow
1. Create/edit monthly menu before ordering opens
2. Monitor live collection dashboard on distribution days
3. Export reports from Google Sheets

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js (App Router) | SSR for QR pages, easy API routes |
| Styling | Tailwind CSS | Rapid UI development |
| Backend/DB | Google Sheets (via API) | Client is already familiar; no DB setup |
| Auth | NextAuth (Google) for admin; none for parents | Parents access via unique order link |
| Payments | KPay | Client's existing payment provider |
| QR Generation | `qrcode` npm package | Simple, offline-capable |
| QR Scanning | `html5-qrcode` | Works on mobile camera |
| Email | Resend (or Nodemailer) | Order confirmation + QR delivery |
| Hosting | Vercel | Free tier, zero-config Next.js |

---

## Repository Structure

```
lunchflow/
├── app/
│   ├── page.tsx                  # Landing / redirect
│   ├── order/
│   │   ├── page.tsx              # Parent ordering form (Step 1: child details)
│   │   ├── menu/page.tsx         # Step 2: menu selection
│   │   ├── payment/page.tsx      # Step 3: KPay payment
│   │   └── confirmation/page.tsx # Step 4: confirmation + QR display
│   ├── scan/
│   │   └── page.tsx              # Staff scanner screen
│   ├── admin/
│   │   ├── page.tsx              # Admin dashboard
│   │   ├── menu/page.tsx         # Manage monthly menu
│   │   └── orders/page.tsx       # View all orders
│   └── api/
│       ├── orders/route.ts       # Create/get orders
│       ├── kpay/
│       │   ├── checkout/route.ts # Initiate KPay payment
│       │   └── webhook/route.ts  # KPay payment callback
│       ├── scan/route.ts         # Look up student by QR token
│       ├── collect/route.ts      # Mark as collected
│       └── menu/route.ts         # Get/set monthly menu
├── components/
│   ├── QRDisplay.tsx
│   ├── QRScanner.tsx
│   ├── MenuCard.tsx
│   ├── OrderSummary.tsx
│   └── CollectionResult.tsx
├── lib/
│   ├── sheets.ts                 # Google Sheets read/write helpers
│   ├── qr.ts                     # QR token generation & validation
│   ├── kpay.ts                   # KPay API wrapper
│   ├── email.ts                  # Send confirmation email
│   └── constants.ts              # School year, menu IDs, etc.
├── types/
│   └── index.ts                  # Shared TypeScript types
└── docs/                         # This folder
```

---

## Environment Variables

```env
# Google Sheets
GOOGLE_SHEETS_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=

# KPay
KPAY_MERCHANT_ID=
KPAY_API_KEY=
KPAY_WEBHOOK_SECRET=
KPAY_BASE_URL=https://api.kpay.com   # confirm with KPay docs

# App
NEXT_PUBLIC_BASE_URL=https://your-domain.com
QR_SECRET=a-long-random-secret-string-for-signing-tokens

# Email (Resend)
RESEND_API_KEY=

# Admin auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=
ADMIN_GOOGLE_EMAIL=admin@yourschool.com
```

---

## Getting Started

```bash
git clone <repo>
cd lunchflow
npm install
cp .env.example .env.local
# fill in .env.local
npm run dev
```

See individual spec files for detailed implementation guidance:
- `DATAMODEL.md` — Google Sheets structure and data types
- `FLOWS.md` — Detailed user flow logic and edge cases
- `KPAY.md` — Payment integration spec
- `SCANNER.md` — QR generation, scanning, and collection logic
