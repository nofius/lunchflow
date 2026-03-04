import { google } from 'googleapis'
import type {
  Order,
  MenuItem,
  MenuScheduleDay,
  OrderDaySelection,
  CollectionLog,
  Lane,
  PaymentStatus,
} from '@/types'

// ─── Google Sheets Auth ──────────────────────────────────────────────────────

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

function getSheets() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!

// ─── Sheet Names ─────────────────────────────────────────────────────────────

const SHEET_ORDERS = 'orders'
const SHEET_MENU_ITEMS = 'menu_items'
const SHEET_MENU_SCHEDULE = 'menu_schedule'
const SHEET_ORDER_DAYS = 'order_days'
const SHEET_COLLECTION_LOG = 'collection_log'

// ─── Row <-> Object Mapping ─────────────────────────────────────────────────

/*
 * orders sheet columns (A–N):
 * A: order_id
 * B: qr_token
 * C: child_name
 * D: child_class
 * E: parent_name
 * F: parent_email
 * G: parent_phone
 * H: menu_month
 * I: days_ordered
 * J: amount_hkd
 * K: payment_status
 * L: kpay_reference
 * M: order_created_at
 * N: payment_confirmed_at
 * O: email_sent
 * P: notes
 */

function rowToOrder(row: string[]): Order {
  return {
    order_id: row[0] || '',
    qr_token: row[1] || '',
    child_name: row[2] || '',
    child_class: row[3] || '',
    parent_name: row[4] || '',
    parent_email: row[5] || '',
    parent_phone: row[6] || undefined,
    menu_month: row[7] || '',
    days_ordered: Number(row[8]) || 0,
    amount_hkd: Number(row[9]) || 0,
    payment_status: (row[10] || 'pending') as PaymentStatus,
    kpay_reference: row[11] || undefined,
    order_created_at: row[12] || '',
    payment_confirmed_at: row[13] || undefined,
    email_sent: row[14] === 'TRUE',
    collected_today: false, // derived at runtime, not stored
    notes: row[15] || undefined,
  }
}

function orderToRow(order: Order): string[] {
  return [
    order.order_id,
    order.qr_token,
    order.child_name,
    order.child_class,
    order.parent_name,
    order.parent_email,
    order.parent_phone || '',
    order.menu_month,
    String(order.days_ordered),
    String(order.amount_hkd),
    order.payment_status,
    order.kpay_reference || '',
    order.order_created_at,
    order.payment_confirmed_at || '',
    order.email_sent ? 'TRUE' : 'FALSE',
    order.notes || '',
  ]
}

/*
 * menu_items sheet columns (A–F):
 * A: item_id, B: item_name, C: description, D: emoji, E: lane, F: is_active
 */

function rowToMenuItem(row: string[]): MenuItem {
  return {
    item_id: row[0] || '',
    item_name: row[1] || '',
    description: row[2] || '',
    emoji: row[3] || '',
    lane: (row[4] || 'A') as Lane,
    is_active: row[5] === 'TRUE',
  }
}

/*
 * menu_schedule sheet columns (A–E):
 * A: date (YYYY-MM-DD), B: item_id, C: item_name, D: emoji, E: lane
 */

function rowToMenuScheduleDay(row: string[]): MenuScheduleDay {
  return {
    date: row[0] || '',
    item_id: row[1] || '',
    item_name: row[2] || '',
    emoji: row[3] || '',
    lane: (row[4] || 'A') as Lane,
  }
}

/*
 * order_days sheet columns (A–I):
 * A: order_id, B: date, C: item_id, D: item_name, E: emoji,
 * F: lane, G: collected, H: collected_at, I: collected_by
 */

function rowToOrderDay(row: string[]): OrderDaySelection {
  return {
    order_id: row[0] || '',
    date: row[1] || '',
    item_id: row[2] || '',
    item_name: row[3] || '',
    emoji: row[4] || '',
    lane: (row[5] || 'A') as Lane,
    collected: row[6] === 'TRUE',
    collected_at: row[7] || undefined,
    collected_by: row[8] || undefined,
  }
}

function orderDayToRow(d: OrderDaySelection): string[] {
  return [
    d.order_id,
    d.date,
    d.item_id,
    d.item_name,
    d.emoji,
    d.lane,
    d.collected ? 'TRUE' : 'FALSE',
    d.collected_at || '',
    d.collected_by || '',
  ]
}

function collectionLogToRow(log: CollectionLog): string[] {
  return [
    log.log_id,
    log.scanned_at,
    log.order_id || '',
    log.qr_token_hash,
    log.child_name || '',
    log.child_class || '',
    log.menu_item_name || '',
    log.result,
    log.staff_id,
    log.device_id || '',
  ]
}

// ─── Orders Functions ────────────────────────────────────────────────────────

export async function getOrders(month: string): Promise<Order[]> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDERS}!A2:P`,
  })

  const rows = res.data.values || []
  return rows.map(row => rowToOrder(row)).filter(order => order.menu_month === month)
}

export async function getOrderByToken(token: string): Promise<Order | null> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDERS}!A2:P`,
  })

  const rows = res.data.values || []
  const row = rows.find(r => r[1] === token)
  return row ? rowToOrder(row) : null
}

export async function getOrderByChild(
  name: string,
  cls: string,
  month: string
): Promise<Order | null> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDERS}!A2:P`,
  })

  const rows = res.data.values || []
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  for (const row of rows) {
    const order = rowToOrder(row)
    if (
      order.child_name.toLowerCase() === name.toLowerCase() &&
      order.child_class.toLowerCase() === cls.toLowerCase() &&
      order.menu_month === month
    ) {
      if (order.payment_status === 'paid') return order
      if (order.payment_status === 'pending' && order.order_created_at > thirtyMinAgo) return order
    }
  }
  return null
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDERS}!A2:P`,
  })

  const rows = res.data.values || []
  const row = rows.find(r => r[0] === orderId)
  return row ? rowToOrder(row) : null
}

export async function appendOrder(order: Order): Promise<void> {
  const sheets = getSheets()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDERS}!A:P`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [orderToRow(order)] },
  })
}

export async function updateOrder(
  orderId: string,
  updates: Partial<Order>
): Promise<void> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDERS}!A2:P`,
  })

  const rows = res.data.values || []
  const rowIndex = rows.findIndex(r => r[0] === orderId)

  if (rowIndex === -1) throw new Error(`Order not found: ${orderId}`)

  const sheetRow = rowIndex + 2
  const existing = rowToOrder(rows[rowIndex])
  const updated = { ...existing, ...updates }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDERS}!A${sheetRow}:P${sheetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [orderToRow(updated)] },
  })
}

// ─── Menu Functions ──────────────────────────────────────────────────────────

/**
 * Fetch the active meal catalog (menu_items sheet).
 */
export async function getMenuItems(): Promise<MenuItem[]> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_MENU_ITEMS}!A2:F`,
  })

  const rows = res.data.values || []
  return rows.map(row => rowToMenuItem(row)).filter(item => item.is_active)
}

/**
 * Fetch the daily menu schedule for a given month.
 * Returns rows sorted by date, each row = one available item on that date.
 */
export async function getMenuSchedule(month: string): Promise<MenuScheduleDay[]> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_MENU_SCHEDULE}!A2:E`,
  })

  const rows = res.data.values || []
  return rows
    .map(row => rowToMenuScheduleDay(row))
    .filter(row => row.date.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// ─── Order Days Functions ────────────────────────────────────────────────────

/**
 * Append daily meal selections for an order.
 */
export async function appendOrderDays(days: OrderDaySelection[]): Promise<void> {
  if (days.length === 0) return
  const sheets = getSheets()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDER_DAYS}!A:I`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: days.map(d => orderDayToRow(d)) },
  })
}

/**
 * Get all daily selections for an order.
 */
export async function getOrderDays(orderId: string): Promise<OrderDaySelection[]> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDER_DAYS}!A2:I`,
  })

  const rows = res.data.values || []
  return rows
    .map(row => rowToOrderDay(row))
    .filter(d => d.order_id === orderId)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Get a specific day's selection for an order.
 */
export async function getOrderDayForDate(
  orderId: string,
  date: string
): Promise<OrderDaySelection | null> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDER_DAYS}!A2:I`,
  })

  const rows = res.data.values || []
  const row = rows.find(r => r[0] === orderId && r[1] === date)
  return row ? rowToOrderDay(row) : null
}

/**
 * Mark a specific day's meal as collected in the order_days sheet.
 */
export async function markDayCollected(
  orderId: string,
  date: string,
  staffId: string
): Promise<void> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDER_DAYS}!A2:I`,
  })

  const rows = res.data.values || []
  const rowIndex = rows.findIndex(r => r[0] === orderId && r[1] === date)

  if (rowIndex === -1) throw new Error(`Order day not found: ${orderId} / ${date}`)

  const sheetRow = rowIndex + 2
  const now = new Date().toISOString()

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `${SHEET_ORDER_DAYS}!G${sheetRow}`, values: [['TRUE']] },
        { range: `${SHEET_ORDER_DAYS}!H${sheetRow}`, values: [[now]] },
        { range: `${SHEET_ORDER_DAYS}!I${sheetRow}`, values: [[staffId]] },
      ],
    },
  })
}

// ─── Collection Log Functions ────────────────────────────────────────────────

export async function appendCollectionLog(log: CollectionLog): Promise<void> {
  const sheets = getSheets()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_COLLECTION_LOG}!A:J`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [collectionLogToRow(log)] },
  })
}

// ─── Utility Functions ───────────────────────────────────────────────────────

export async function getNextOrderId(month: string): Promise<string> {
  const orders = await getOrders(month)
  const prefix = `ORD-${month}-`

  let maxSeq = 0
  for (const order of orders) {
    if (order.order_id.startsWith(prefix)) {
      const seq = parseInt(order.order_id.slice(prefix.length), 10)
      if (seq > maxSeq) maxSeq = seq
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(5, '0')}`
}
