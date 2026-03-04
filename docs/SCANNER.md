# SCANNER.md — QR Generation, Scanning & Collection

---

## QR Token Design

Each confirmed order gets one QR token, valid for the entire month.

### Token Structure (JWT)

```json
{
  "order_id": "ORD-2025-04-00123",
  "menu_month": "2025-04"
}
```

- Signed with `HS256` using `QR_SECRET`
- No expiry set in JWT — validity is controlled by order's `payment_status` in Sheets
- The QR code image encodes the raw JWT string (not a URL)

### Why JWT over UUID?
- The scanner can partially validate the token offline (signature check) before hitting the Sheets API
- `menu_month` is embedded so wrong-month errors are caught instantly without a DB call
- Still requires Sheets lookup to check `collected` status and get order details

---

## QR Code Image Generation

### Server-side (for email attachment)

```typescript
// lib/qr.ts
import QRCode from 'qrcode'

export async function generateQRImageBuffer(token: string): Promise<Buffer> {
  return QRCode.toBuffer(token, {
    errorCorrectionLevel: 'M',
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })
}
```

### Client-side (for confirmation page display)

```tsx
// components/QRDisplay.tsx
import QRCode from 'qrcode'
import { useEffect, useRef } from 'react'

export function QRDisplay({ token, childName, month }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, token, { width: 280, margin: 2 })
    }
  }, [token])

  return (
    <div className="qr-wrapper">
      <canvas ref={canvasRef} />
      <p className="qr-label">{childName} — {month}</p>
      <p className="qr-sub">Show this at the canteen every lunch day</p>
    </div>
  )
}
```

---

## Scanner Component

### `components/QRScanner.tsx`

Uses `html5-qrcode` library.

```typescript
import { Html5QrcodeScanner } from 'html5-qrcode'

// Key config
const scanner = new Html5QrcodeScanner('qr-reader', {
  fps: 10,
  qrbox: { width: 280, height: 280 },
  rememberLastUsedCamera: true,
  showTorchButtonIfSupported: true,  // important for canteen lighting
})

scanner.render(
  async (decodedText) => {
    scanner.pause()  // pause immediately to avoid double-scans
    await handleScan(decodedText)
    // resume after result shown and staff taps "Next"
  },
  (error) => { /* ignore scan errors, they're frequent */ }
)
```

**Important UX notes:**
- Pause scanner immediately on successful decode to prevent re-scanning
- Show torch/flashlight button (canteen may have poor lighting)
- Full-screen camera on mobile — no scroll needed
- Result card must be large enough to read from arm's length
- Auto-reset to scanning mode after 8 seconds (configurable)

---

## Scanner Page Layout (`/scan`)

```
┌─────────────────────────────────┐
│  LunchFlow Scanner  │ 12:14 PM  │
├─────────────────────────────────┤
│                                 │
│     [  Camera Viewfinder  ]     │
│     [  with QR target box ]     │
│     [  280×280px          ]     │
│                                 │
├─────────────────────────────────┤
│ LANES TODAY                     │
│ [A] Chicken Rice   [B] Pasta    │
│ [C] Bento          [D] Veggie   │
└─────────────────────────────────┘
```

**Result overlay (shown over viewfinder):**

State: OK
```
┌─────────────────────────────────┐  ← green border
│ ✅  Chan Mei Ling               │
│     Form 2A                     │
│                                 │
│     🍚 Chicken Rice             │
│     ┌───────────┐               │
│     │  LANE  A  │  (large badge)│
│     └───────────┘               │
│                                 │
│  [ ✓ Mark as Collected ]        │
│  [ Next student ]               │
└─────────────────────────────────┘
```

State: Already Collected
```
┌─────────────────────────────────┐  ← orange border
│ ⚠️  Chan Mei Ling               │
│     Form 2A                     │
│     Already collected at 12:04  │
│                                 │
│  [ Flag for floater ]           │
│  [ Next student ]               │
└─────────────────────────────────┘
```

State: Invalid
```
┌─────────────────────────────────┐  ← red border
│ ❌  Invalid QR Code             │
│     Cannot verify this student  │
│                                 │
│  [ Manual Lookup ]              │
│  [ Try again ]                  │
└─────────────────────────────────┘
```

---

## Manual Lookup (for lost QR codes)

Accessible via the "Manual Lookup" button on the scan page.

**UI:** A slide-up drawer with:
- Text input: student name (with keyboard auto-shown on mobile)
- Dropdown/input: class
- "Find" button

**API:** `GET /api/orders?name=Chan+Mei+Ling&class=Form+2A&month=2025-04`

Returns the matching order if found. Staff can then tap "Mark as Collected" which calls `/api/collect`.

This action is logged in `collection_log` with `result = 'collected_manual'`.

---

## `/api/scan` — Full Implementation Reference

```typescript
// app/api/scan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { getOrderById, appendCollectionLog } from '@/lib/sheets'
import { getCurrentMonth } from '@/lib/constants'

export async function POST(req: NextRequest) {
  const { token, staff_id, device_id } = await req.json()

  // 1. Verify JWT signature
  let payload: { order_id: string; menu_month: string }
  try {
    payload = jwt.verify(token, process.env.QR_SECRET!) as typeof payload
  } catch {
    await appendCollectionLog({ result: 'invalid', staff_id, device_id, qr_token_hash: hash(token) })
    return NextResponse.json({ result: 'invalid' })
  }

  // 2. Check month
  const currentMonth = getCurrentMonth() // e.g. '2025-04'
  if (payload.menu_month !== currentMonth) {
    return NextResponse.json({ result: 'wrong_month', expected: currentMonth, got: payload.menu_month })
  }

  // 3. Fetch order
  const order = await getOrderById(payload.order_id)
  if (!order) {
    return NextResponse.json({ result: 'invalid' })
  }

  // 4. Check payment
  if (order.payment_status !== 'paid') {
    return NextResponse.json({ result: 'unpaid' })
  }

  // 5. Check already collected
  if (order.collected) {
    await appendCollectionLog({ ...order, result: 'already_collected', staff_id, device_id })
    return NextResponse.json({
      result: 'already_collected',
      child_name: order.child_name,
      child_class: order.child_class,
      collected_at: order.collected_at
    })
  }

  // 6. Success — return order details (do NOT mark collected yet, wait for staff tap)
  await appendCollectionLog({ ...order, result: 'scanned_ok', staff_id, device_id })
  return NextResponse.json({
    result: 'ok',
    order_id: order.order_id,
    child_name: order.child_name,
    child_class: order.child_class,
    menu_item_name: order.menu_item_name,
    menu_item_emoji: order.menu_item_emoji,
    lane: order.lane
  })
}
```

---

## `/api/collect` — Mark as Collected

```typescript
// app/api/collect/route.ts
export async function POST(req: NextRequest) {
  const { order_id, staff_id } = await req.json()

  const order = await getOrderById(order_id)
  if (!order || order.payment_status !== 'paid') {
    return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
  }
  if (order.collected) {
    return NextResponse.json({ success: false, error: 'Already collected' }, { status: 409 })
  }

  await markCollected(order_id, staff_id)
  await appendCollectionLog({ ...order, result: 'collected', staff_id })

  return NextResponse.json({ success: true })
}
```

---

## Staff Access Control (MVP)

For MVP, protect `/scan` with a shared secret in the URL:

```
/scan?key=STAFF_KEY
```

Where `STAFF_KEY` is set in env vars. Middleware checks this key and sets a session cookie so staff don't have to re-enter on each scan.

```typescript
// middleware.ts
if (pathname.startsWith('/scan')) {
  const key = searchParams.get('key') || cookies.get('staff_key')
  if (key !== process.env.STAFF_KEY) {
    return redirect('/scan-login')
  }
}
```

For future: add individual staff logins for better `collected_by` attribution.
