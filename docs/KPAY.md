# KPAY.md — Payment Integration Spec

---

## Overview

LunchFlow uses KPay as its payment provider. KPay is a Hong Kong-based payment platform supporting credit cards, Octopus, PayMe, and FPS.

> ⚠️ **Note for Claude Code:** KPay's exact API spec should be confirmed against their official developer documentation before implementation. The structure below follows standard payment gateway patterns and should be adjusted to match the actual KPay API.

---

## Payment Flow

```
Parent clicks "Pay"
    → POST /api/kpay/checkout
        → Create pending order in Sheets
        → Call KPay Create Payment API
        → Return { payment_url }
    → Redirect parent to payment_url (KPay hosted page)

Parent completes payment on KPay
    → KPay sends webhook POST /api/kpay/webhook
        → Verify webhook signature
        → Update order: payment_status = 'paid', kpay_reference = '...'
        → Generate QR token and store in order row
        → Send confirmation email with QR code
    → KPay redirects parent to /order/confirmation?order_id=...
```

**Important:** Payment status is set by the **webhook**, not the redirect. The confirmation page should poll until `payment_status === 'paid'`.

---

## API Routes

### `POST /api/kpay/checkout`

**Request body:**
```json
{
  "child_name": "Chan Mei Ling",
  "child_class": "Form 2A",
  "parent_name": "Chan Wai Lam",
  "parent_email": "wailam@gmail.com",
  "parent_phone": "+85291234567",
  "menu_item_id": "chicken-rice",
  "menu_month": "2025-04"
}
```

**Server logic:**
1. Validate all fields
2. Double-check no paid order exists for this child/month (race condition guard)
3. Load menu item from Sheets to get `total_price_hkd`, `lane`, `item_name`
4. Generate `order_id`: `ORD-{YYYY-MM}-{5-digit-zero-padded-sequence}`
5. Write pending order to Sheets (`payment_status = 'pending'`)
6. Call KPay API to create payment session:

```typescript
// lib/kpay.ts
export async function createKPayPayment(params: {
  orderId: string
  amountHkd: number
  description: string
  customerEmail: string
  successUrl: string
  cancelUrl: string
  webhookUrl: string
}): Promise<{ payment_url: string; kpay_session_id: string }>
```

Expected KPay request (confirm with KPay docs):
```json
{
  "merchant_id": "KPAY_MERCHANT_ID",
  "order_ref": "ORD-2025-04-00123",
  "amount": 900,
  "currency": "HKD",
  "description": "LunchFlow — April 2025 — Chicken Rice (Chan Mei Ling)",
  "success_url": "https://your-domain.com/order/confirmation?order_id=ORD-2025-04-00123",
  "cancel_url": "https://your-domain.com/order/payment?cancelled=true",
  "webhook_url": "https://your-domain.com/api/kpay/webhook",
  "customer_email": "wailam@gmail.com"
}
```

7. Return `{ payment_url }` to client
8. Client redirects to `payment_url`

---

### `POST /api/kpay/webhook`

KPay will POST to this endpoint when payment status changes.

**Security — verify webhook signature:**
```typescript
// KPay typically sends a signature header — confirm exact header name with KPay docs
const signature = request.headers.get('x-kpay-signature')
const isValid = verifyKPaySignature(await request.text(), signature, process.env.KPAY_WEBHOOK_SECRET)
if (!isValid) return Response.json({ error: 'Invalid signature' }, { status: 401 })
```

**Expected webhook payload (confirm with KPay docs):**
```json
{
  "event": "payment.success",
  "order_ref": "ORD-2025-04-00123",
  "kpay_reference": "KP-20250401-XYZ789",
  "amount": 900,
  "currency": "HKD",
  "paid_at": "2025-03-20T14:33:10Z"
}
```

**Server logic on `payment.success`:**
1. Look up order by `order_ref` in Sheets
2. Verify order exists and is `pending`
3. Generate QR token:
```typescript
// lib/qr.ts
import jwt from 'jsonwebtoken'

export function generateQRToken(orderId: string, menuMonth: string): string {
  return jwt.sign(
    { order_id: orderId, menu_month: menuMonth },
    process.env.QR_SECRET!,
    { algorithm: 'HS256' } // no expiry — valid for whole month, invalidated by refund status
  )
}
```
4. Update order row in Sheets:
   - `payment_status = 'paid'`
   - `kpay_reference = kpay_reference`
   - `payment_confirmed_at = now()`
   - `qr_token = generatedToken`
5. Send confirmation email (see `EMAIL.md` section below)
6. Return `200 OK` to KPay

**On `payment.refund` (if KPay supports):**
1. Update `payment_status = 'refunded'`
2. The QR token remains in the sheet but `/api/scan` will reject it (checks payment_status)

---

## Pending Order Cleanup

Orders created with `payment_status = 'pending'` but never paid should not block re-ordering. Implement a cleanup rule:

- In the duplicate-check query (`getOrderByChild`), only match rows where `payment_status = 'paid'`
- Pending rows older than 30 minutes are ignored for uniqueness purposes
- Optionally: run a nightly cleanup script to delete stale pending rows

---

## Testing

KPay should provide a sandbox environment. Set `KPAY_BASE_URL` to the sandbox URL during development.

Use these test scenarios:
- Successful payment → webhook fires → order marked paid → QR generated
- Failed payment → parent lands on cancel URL → pending order remains
- Webhook fires twice (idempotency) → second call is ignored gracefully
- Invalid webhook signature → rejected with 401

---

## Email Confirmation

Triggered inside the webhook handler after marking order as paid.

```typescript
// lib/email.ts
export async function sendOrderConfirmation(params: {
  to: string
  parentName: string
  childName: string
  childClass: string
  menuItemName: string
  menuMonth: string
  orderId: string
  qrToken: string
}): Promise<void>
```

Email content:
- Subject: `LunchFlow — Your April 2025 lunch order is confirmed 🍱`
- Body: order summary table
- Attached: QR code as PNG (generate server-side with `qrcode` package)
- QR image alt text: child name + month (accessibility)

The QR code encodes the raw `qr_token` string. No URL needed — the scanner decodes the JWT directly.
