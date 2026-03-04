// types/index.ts

// ─── Menu ────────────────────────────────────────────────────────────────────

export type Lane = 'A' | 'B' | 'C' | 'D'

/**
 * A meal option that can appear on the daily schedule.
 * Staff maintains these in the `menu_items` sheet.
 */
export interface MenuItem {
  item_id: string       // e.g. 'chicken-rice'
  item_name: string     // e.g. 'Hainanese Chicken Rice'
  description: string
  emoji: string         // e.g. '🍚'
  lane: Lane
  is_active: boolean
}

/**
 * One row of the daily menu schedule (staff-maintained).
 * Each date can have multiple available items.
 */
export interface MenuScheduleDay {
  date: string          // YYYY-MM-DD
  item_id: string
  item_name: string
  emoji: string
  lane: Lane
}

/**
 * Daily schedule grouped by date, returned by the menu API.
 */
export interface DailyMenu {
  date: string          // YYYY-MM-DD
  day_label: string     // e.g. 'Mon 7 Apr'
  items: MenuScheduleDay[]
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type PaymentStatus = 'pending' | 'paid' | 'refunded'

/**
 * A monthly order for one child. Daily meal choices are stored
 * separately in the `order_days` sheet.
 */
export interface Order {
  order_id: string
  qr_token: string
  child_name: string
  child_class: string
  parent_name: string
  parent_email: string
  parent_phone?: string
  menu_month: string        // YYYY-MM
  days_ordered: number      // how many days the parent selected
  amount_hkd: number        // days_ordered × PRICE_PER_DAY
  payment_status: PaymentStatus
  kpay_reference?: string
  order_created_at: string  // ISO datetime string
  payment_confirmed_at?: string
  email_sent: boolean
  collected_today: boolean  // reset daily by the scanner context
  notes?: string
}

/**
 * One row in the `order_days` sheet — a child's meal for a specific date.
 */
export interface OrderDaySelection {
  order_id: string
  date: string              // YYYY-MM-DD
  item_id: string
  item_name: string
  emoji: string
  lane: Lane
  collected: boolean
  collected_at?: string
  collected_by?: string
}

export type CreateOrderInput = Pick<
  Order,
  | 'child_name'
  | 'child_class'
  | 'parent_name'
  | 'parent_email'
  | 'parent_phone'
  | 'menu_month'
>

// ─── Collection Log ──────────────────────────────────────────────────────────

export type ScanResult =
  | 'collected'
  | 'collected_manual'
  | 'already_collected'
  | 'scanned_ok'
  | 'invalid'
  | 'wrong_month'
  | 'unpaid'
  | 'no_meal_today'

export interface CollectionLog {
  log_id: string
  scanned_at: string
  order_id?: string
  qr_token_hash: string
  child_name?: string
  child_class?: string
  menu_item_name?: string
  result: ScanResult
  staff_id: string
  device_id?: string
}

// ─── API Responses ───────────────────────────────────────────────────────────

export type ScanApiResponse =
  | {
      result: 'ok'
      order_id: string
      date: string
      child_name: string
      child_class: string
      menu_item_name: string
      menu_item_emoji: string
      lane: Lane
    }
  | { result: 'already_collected'; child_name: string; child_class: string; collected_at: string }
  | { result: 'wrong_month'; expected: string; got: string }
  | { result: 'no_meal_today'; child_name: string; child_class: string }
  | { result: 'invalid' | 'unpaid' }

export interface CollectApiResponse {
  success: boolean
  error?: string
}

export interface CheckoutApiResponse {
  payment_url: string
  order_ids: string[]
}

// ─── KPay ────────────────────────────────────────────────────────────────────

export interface KPayWebhookPayload {
  event: 'payment.success' | 'payment.failed' | 'payment.refund'
  order_ref: string
  kpay_reference: string
  amount: number
  currency: string
  paid_at: string
}
