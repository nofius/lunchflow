# TASKS.md — MVP Build Checklist for Claude Code

Work through these tasks in order. Each section can be handed to Claude Code as a focused prompt.

---

## Phase 0: Project Bootstrap

- [ ] `npx create-next-app@latest lunchflow --typescript --tailwind --app --src-dir=false`
- [ ] Install dependencies:
  ```bash
  npm install googleapis jsonwebtoken qrcode html5-qrcode resend next-auth
  npm install -D @types/jsonwebtoken @types/qrcode
  ```
- [ ] Create `.env.local` from the variables listed in `README.md`
- [ ] Create `types/index.ts` — copy types from `TYPES.md`
- [ ] Create `lib/constants.ts`:
  ```typescript
  export const ORDERING_CUTOFF_DAY = 25
  export const STAFF_KEY = process.env.STAFF_KEY!
  export function getCurrentOrderingMonth(): string { /* returns next month if before cutoff, current month otherwise */ }
  export function getCurrentMonth(): string { /* returns current YYYY-MM */ }
  ```

---

## Phase 1: Google Sheets Integration

**Prompt for Claude Code:**
> Implement `lib/sheets.ts` using the `googleapis` npm package and the schema in `DATAMODEL.md`.
> Implement: `getOrders`, `getOrderByToken`, `getOrderByChild`, `getOrderById`, `appendOrder`, `markCollected`, `getMenu`, `appendCollectionLog`.
> Use the service account credentials from env vars. All functions should be async and throw descriptive errors on failure.

- [ ] `lib/sheets.ts` — all helper functions
- [ ] Test: manually call `getMenu('2025-04')` and verify it reads from the sheet

---

## Phase 2: Parent Ordering Flow

**Prompt for Claude Code:**
> Build the parent ordering flow as described in `FLOWS.md` Flow 1.
> Pages: `/order` (child details form), `/order/menu` (meal selection), `/order/payment` (summary + pay button), `/order/confirmation` (QR display + polling).
> Use Tailwind for styling. Mobile-first. Keep it clean and simple — parents may be non-technical.
> Use `sessionStorage` to pass form state between steps.
> The "Pay" button calls `POST /api/kpay/checkout` and redirects to the returned `payment_url`.

- [ ] `app/order/page.tsx` — child details form with duplicate-order check
- [ ] `app/order/menu/page.tsx` — menu cards from `GET /api/menu?month=...`
- [ ] `app/order/payment/page.tsx` — order summary + KPay redirect
- [ ] `app/order/confirmation/page.tsx` — confirmation + QR display + download button
- [ ] `components/QRDisplay.tsx`
- [ ] `components/MenuCard.tsx`
- [ ] `app/api/menu/route.ts` — GET handler reading from Sheets
- [ ] `app/api/orders/route.ts` — GET (lookup by child/month) handler

---

## Phase 3: KPay Integration

**Prompt for Claude Code:**
> Implement KPay payment integration per `KPAY.md`.
> Confirm exact API field names and webhook signature method against KPay's official developer docs before writing code.
> `POST /api/kpay/checkout` — create pending order, call KPay, return payment_url.
> `POST /api/kpay/webhook` — verify signature, mark order paid, generate QR token, send confirmation email.

- [ ] `lib/kpay.ts` — KPay API wrapper
- [ ] `lib/qr.ts` — `generateQRToken`, `generateQRImageBuffer`, `verifyQRToken`
- [ ] `lib/email.ts` — `sendOrderConfirmation` using Resend
- [ ] `app/api/kpay/checkout/route.ts`
- [ ] `app/api/kpay/webhook/route.ts`

---

## Phase 4: Scanner

**Prompt for Claude Code:**
> Build the staff scanner screen at `/scan` per `SCANNER.md`.
> Use `html5-qrcode` for camera scanning.
> Full-screen mobile layout. Show result card with large lane badge after scan.
> "Mark as Collected" button calls `POST /api/collect`.
> Manual lookup drawer for lost QR codes.
> Protect the route with the `STAFF_KEY` middleware described in `SCANNER.md`.

- [ ] `app/scan/page.tsx` — scanner UI
- [ ] `components/QRScanner.tsx` — html5-qrcode wrapper
- [ ] `components/CollectionResult.tsx` — result card (ok / already_collected / invalid)
- [ ] `app/api/scan/route.ts`
- [ ] `app/api/collect/route.ts`
- [ ] `middleware.ts` — STAFF_KEY protection for `/scan`

---

## Phase 5: Admin

**Prompt for Claude Code:**
> Build the admin section at `/admin` protected by NextAuth Google login.
> Only the email in `ADMIN_GOOGLE_EMAIL` env var can access.
> `/admin` — dashboard with today's collection count and links.
> `/admin/menu` — CRUD for menu items (reads/writes `menu` sheet).
> `/admin/orders` — paginated table of orders for selected month, with CSV export.

- [ ] NextAuth setup — `app/api/auth/[...nextauth]/route.ts`
- [ ] Admin middleware — reject non-admin Google accounts
- [ ] `app/admin/page.tsx`
- [ ] `app/admin/menu/page.tsx`
- [ ] `app/admin/orders/page.tsx`

---

## Phase 6: Polish & Deploy

- [ ] Add loading states to all API calls
- [ ] Add error boundaries and user-friendly error pages
- [ ] Test full flow end-to-end in KPay sandbox
- [ ] Test QR scan on physical mobile device
- [ ] Deploy to Vercel
- [ ] Set all env vars in Vercel dashboard
- [ ] Configure KPay webhook URL to point to production domain
- [ ] Smoke test: place one real order, pay, receive QR email, scan QR at canteen

---

## Out of Scope for MVP (future iterations)

- WhatsApp QR delivery (add after MVP)
- Multiple children per parent account
- Per-day menu variation (same item all month for MVP)
- Automated refunds via KPay API
- Staff individual logins
- Push notifications for low pickup alerts
- Student roster validation
