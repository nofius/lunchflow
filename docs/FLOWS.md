# FLOWS.md — User Flows & Business Logic

---

## Flow 1: Parent Ordering

### Entry Point
`/order` — publicly accessible, no login required.

### Step 1: Child Details (`/order`)

**Form fields:**
- Child's full name (required)
- Child's class / form (required, dropdown or free text)
- Parent name (required)
- Parent email (required, used for confirmation + QR delivery)
- Parent phone (optional, for WhatsApp QR sharing)

**On submit:**
1. Validate all required fields
2. Check for existing paid order: call `getOrderByChild(name, class, currentMonth)`
3. If order exists → show message: *"A lunch order for [name] in [month] already exists. Check your email for the QR code."* → do not proceed
4. If no existing order → proceed to Step 2

**Current month logic:**
- Orders are open from the 1st to the 25th of the previous month
- Example: April orders open March 1–25
- Outside this window → show: *"Ordering for [month] is now closed. Orders open on [date]."*
- `ORDERING_CUTOFF_DAY = 25` in `lib/constants.ts`

---

### Step 2: Menu Selection (`/order/menu`)

**Display:**
- Month name and total price prominently shown
- 3–4 menu cards (from `getMenu(currentOrderingMonth)`)
- Each card shows: emoji, item name, description, price per day, total monthly price
- One item must be selected to proceed
- "Back" navigates to Step 1 without losing entered data (use session storage or query params)

**On submit:**
- Store selection in session/state
- Proceed to Step 3

---

### Step 3: Payment (`/order/payment`)

**Display:**
- Order summary: child name, class, item selected, total amount
- "Pay HKD [amount] with KPay" button

**On click:**
1. Call `POST /api/kpay/checkout` with order details
2. API creates a pending order record in Sheets (payment_status = `pending`)
3. API returns KPay payment URL
4. Redirect parent to KPay hosted payment page

See `KPAY.md` for full payment integration details.

---

### Step 4: Confirmation (`/order/confirmation`)

**Entry:** Parent is redirected here by KPay after payment succeeds.

KPay redirects to: `/order/confirmation?order_id=ORD-2025-04-00123`

**On page load:**
1. Fetch order by `order_id` from Sheets
2. Verify `payment_status === 'paid'` (set by webhook, not redirect — see KPAY.md)
3. If not yet paid → show spinner + poll every 2 seconds up to 30 seconds
4. If paid → display:
   - ✅ Success message
   - Child name, class, item, month
   - QR code image (generated from `qr_token`)
   - "Download QR" button
   - "Send to email" button (if not yet sent)
   - Instruction text: *"Your child should show this QR code at the canteen each lunch day. The same QR code is valid for the entire month of [month]."*

**Email:**
- Triggered by webhook (not confirmation page) to avoid double-sending
- Contains: order summary + QR code image attached as PNG

---

## Flow 2: Staff Scanner

### Entry Point
`/scan` — accessible on any device with a camera (tablet or phone). No login for MVP; protect with a simple PIN or URL secret (e.g. `/scan?key=STAFF_KEY`).

### Screen Layout
Single full-screen page. Two states:

**State A: Ready to Scan**
- Large camera viewfinder (QR scanner active)
- Lane guide sidebar showing today's item → lane mapping
- Current time displayed

**State B: Result Displayed**
Shown immediately after a valid scan. Auto-resets to State A after 8 seconds or when staff taps "Next".

Result card shows:
- ✅ Green card (valid, not yet collected):
  - Student name (large)
  - Class
  - Item name + emoji
  - Lane badge (A / B / C / D) — large and prominent
  - **"Mark as Collected" button** — staff taps this to confirm handoff
- ⚠️ Orange card (already collected today):
  - Student name
  - "Already collected at [time]"
  - "Flag for floater" button
- ❌ Red card (invalid QR):
  - "Invalid QR code"
  - "Manual lookup" button → opens search by name/class

### Scan Logic (called via `POST /api/scan`)

Input: `{ token: string, staff_id: string, device_id: string }`

1. Decode and verify JWT signature using `QR_SECRET`
2. If invalid signature → return `{ result: 'invalid' }`
3. Extract `order_id` and `menu_month` from token payload
4. Fetch order from Sheets by `order_id`
5. If not found → return `{ result: 'invalid' }`
6. If `menu_month` does not match current month → return `{ result: 'wrong_month', month: order.menu_month }`
7. If `payment_status !== 'paid'` → return `{ result: 'unpaid' }`
8. If `collected === true` → return `{ result: 'already_collected', collected_at: order.collected_at }`
9. Return `{ result: 'ok', order: { child_name, child_class, menu_item_name, menu_item_emoji, lane } }`
10. Append to `collection_log` regardless of result

### Mark Collected Logic (called via `POST /api/collect`)

Input: `{ order_id: string, staff_id: string }`

1. Fetch order → verify it exists and `payment_status === 'paid'`
2. If already collected → return error (idempotency guard)
3. Update row: `collected = TRUE`, `collected_at = now()`, `collected_by = staff_id`
4. Append success entry to `collection_log`
5. Return `{ success: true }`

---

## Flow 3: Admin

### Entry Point
`/admin` — protected by NextAuth (Google login). Only the configured `ADMIN_GOOGLE_EMAIL` can access.

### Pages

**`/admin`** — Dashboard
- Today's collection progress (if it's a lunch day)
- Orders placed this month vs last month
- Link to Google Sheet (external)

**`/admin/menu`** — Monthly Menu Manager
- View current and upcoming month menus
- Add / edit / deactivate menu items
- Set ordering open/close dates per month
- Writes to `menu` sheet via Sheets API

**`/admin/orders`** — Order List
- Table of all orders for selected month
- Filter by class, item, collected status
- Export to CSV
- Mark individual orders as refunded

---

## Edge Cases & Rules

| Scenario | Behaviour |
|---|---|
| Parent tries to order twice for same child/month | Blocked at Step 1 with message |
| Payment initiated but abandoned (no webhook) | Order stays `pending`; doesn't block re-ordering after 30 min timeout |
| QR scanned from wrong month | Scanner shows "Wrong month" warning |
| Student lost QR code | Staff uses manual lookup on `/scan` → name + class search |
| Student absent on a day | No action needed; QR remains valid for the rest of the month |
| Refund needed | Admin marks order as `refunded` in admin panel; QR becomes invalid |
| Menu item sold out (`max_orders` reached) | Item shows as unavailable during ordering |
