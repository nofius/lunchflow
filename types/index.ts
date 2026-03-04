// types/index.ts

// ─── Menu ────────────────────────────────────────────────────────────────────

export type Lane = 'A' | 'B' | 'C' | 'D'

export interface MenuItem {
  item_id: string         // e.g. 'chicken-rice'
  menu_month: string      // e.g. '2025-04'
  item_name: string       // e.g. 'Hainanese Chicken Rice'
  description: string
  emoji: string           // e.g. '🍚'
  lane: Lane
  price_hkd: number       // per day
  days_in_month: number
  total_price_hkd: number // price_hkd × days_in_month
  is_active: boolean
  max_orders: number      // 0 = unlimited
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type PaymentStatus = 'pending' | 'paid' | 'refunded'

export interface Order {
  order_id: string
  qr_token: string
  child_name: string
  child_class: string
  parent_name: string
  parent_email: string
  parent_phone?: string
  menu_month: string
  menu_item_id: string
  menu_item_name: string
  menu_item_emoji: string
  lane: Lane
  amount_hkd: number
  payment_status: PaymentStatus
  kpay_reference?: string
  order_created_at: string    // ISO datetime string
  payment_confirmed_at?: string
  email_sent: boolean
  collected: boolean
  collected_at?: string
  collected_by?: string
  notes?: string
}

export type CreateOrderInput = Pick<
  Order,
  | 'child_name'
  | 'child_class'
  | 'parent_name'
  | 'parent_email'
  | 'parent_phone'
  | 'menu_month'
  | 'menu_item_id'
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
      child_name: string
      child_class: string
      menu_item_name: string
      menu_item_emoji: string
      lane: Lane
    }
  | { result: 'already_collected'; child_name: string; child_class: string; collected_at: string }
  | { result: 'wrong_month'; expected: string; got: string }
  | { result: 'invalid' | 'unpaid' }

export interface CollectApiResponse {
  success: boolean
  error?: string
}

export interface CheckoutApiResponse {
  payment_url: string
  order_id: string
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
