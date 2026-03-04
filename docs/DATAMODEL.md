# DATAMODEL.md — Google Sheets Structure

LunchFlow uses Google Sheets as its database. One spreadsheet contains multiple named sheets (tabs).

---

## Spreadsheet Layout

| Sheet Name | Purpose |
|---|---|
| `orders` | One row per confirmed order |
| `menu` | Monthly menu items |
| `students` | Optional student roster for validation |
| `collection_log` | Timestamped pickup records |

---

## Sheet: `orders`

One row is created per confirmed, paid order. Created by the KPay webhook after payment succeeds.

| Column | Key | Type | Example | Notes |
|---|---|---|---|---|
| A | `order_id` | string | `ORD-2025-04-00123` | Auto-generated, unique |
| B | `qr_token` | string | `eyJhbGci...` | Signed JWT, used in QR code |
| C | `child_name` | string | `Chan Mei Ling` | As entered by parent |
| D | `child_class` | string | `Form 2A` | |
| E | `parent_name` | string | `Chan Wai Lam` | |
| F | `parent_email` | string | `wailam@gmail.com` | For confirmation email |
| G | `parent_phone` | string | `+85291234567` | Optional, for WhatsApp |
| H | `menu_month` | string | `2025-04` | YYYY-MM format |
| I | `menu_item_id` | string | `chicken-rice` | Matches `menu` sheet |
| J | `menu_item_name` | string | `Hainanese Chicken Rice` | Denormalized for display |
| K | `lane` | string | `A` | Assigned lane (A/B/C/D) |
| L | `amount_hkd` | number | `900` | Total paid |
| M | `payment_status` | string | `paid` | `pending`, `paid`, `refunded` |
| N | `kpay_reference` | string | `KP-20250401-XYZ` | KPay transaction ID |
| O | `order_created_at` | datetime | `2025-03-20 14:32:00` | |
| P | `payment_confirmed_at` | datetime | `2025-03-20 14:33:10` | Set by webhook |
| Q | `email_sent` | boolean | `TRUE` | Confirmation email sent |
| R | `collected` | boolean | `FALSE` | Updated by scanner |
| S | `collected_at` | datetime | `2025-04-15 12:07:43` | Set when staff marks collected |
| T | `collected_by` | string | `Staff01` | Staff ID or name |
| U | `notes` | string | | Free text for exceptions |

### Uniqueness Rule
Only one row may exist per `(child_class + child_name + menu_month)` combination with `payment_status = paid`. Enforced in the API before creating a new order.

---

## Sheet: `menu`

Managed by admin. Defines what items are available for a given month.

| Column | Key | Type | Example |
|---|---|---|---|
| A | `item_id` | string | `chicken-rice` |
| B | `menu_month` | string | `2025-04` |
| C | `item_name` | string | `Hainanese Chicken Rice` |
| D | `description` | string | `Steamed chicken, fragrant rice, chilli sauce` |
| E | `emoji` | string | `🍚` |
| F | `lane` | string | `A` |
| G | `price_hkd` | number | `45` |
| H | `days_in_month` | number | `20` |
| I | `total_price_hkd` | number | `900` |
| J | `is_active` | boolean | `TRUE` |
| K | `max_orders` | number | `150` | Cap per item, 0 = unlimited |

### Total Price Calculation
`total_price_hkd = price_hkd × days_in_month`
This is the amount charged to the parent for the full month.

---

## Sheet: `collection_log`

Append-only log of every scan event for auditing.

| Column | Key | Type | Example |
|---|---|---|---|
| A | `log_id` | string | `LOG-20250415-0001` |
| B | `scanned_at` | datetime | `2025-04-15 12:07:43` |
| C | `order_id` | string | `ORD-2025-04-00123` |
| D | `qr_token_hash` | string | (hashed, not raw JWT) |
| E | `child_name` | string | `Chan Mei Ling` |
| F | `child_class` | string | `Form 2A` |
| G | `menu_item_name` | string | `Hainanese Chicken Rice` |
| H | `result` | string | `collected` | `collected`, `already_collected`, `invalid`, `wrong_month` |
| I | `staff_id` | string | `Staff01` |
| J | `device_id` | string | `tablet-canteen-1` |

---

## Sheet: `students` (Optional)

Used to validate child name + class during ordering if the school provides a roster.

| Column | Key | Type | Example |
|---|---|---|---|
| A | `student_id` | string | `2A-001` |
| B | `child_name` | string | `Chan Mei Ling` |
| C | `child_class` | string | `Form 2A` |
| D | `active` | boolean | `TRUE` |

If this sheet is empty or not used, name validation is skipped and parents can enter any name/class.

---

## Google Sheets API Setup

1. Create a Google Cloud project
2. Enable the Google Sheets API
3. Create a Service Account → download JSON key
4. Share the spreadsheet with the service account email (Editor access)
5. Set `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` in `.env`

### Helper: `lib/sheets.ts`
Implement these functions:
- `getOrders(month: string)` — fetch all rows for a given month
- `getOrderByToken(token: string)` — look up one order by QR token
- `getOrderByChild(name: string, cls: string, month: string)` — duplicate check
- `appendOrder(order: Order)` — write new confirmed order row
- `markCollected(orderId: string, staffId: string)` — update `collected`, `collected_at`, `collected_by`
- `getMenu(month: string)` — fetch active menu items for a month
- `appendCollectionLog(log: CollectionLog)` — append to log sheet
