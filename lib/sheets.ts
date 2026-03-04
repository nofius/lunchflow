import { google } from 'googleapis'
import type { Order, MenuItem, CollectionLog, Lane, PaymentStatus } from '@/types'

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
const SHEET_MENU = 'menu'
const SHEET_COLLECTION_LOG = 'collection_log'

// ─── Row <-> Object Mapping ─────────────────────────────────────────────────

/**
 * Maps a row from the orders sheet to an Order object.
 * Column order must match DATAMODEL.md exactly.
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
    menu_item_id: row[8] || '',
    menu_item_name: row[9] || '',
    menu_item_emoji: row[10] || '',
    lane: (row[11] || 'A') as Lane,
    amount_hkd: Number(row[12]) || 0,
    payment_status: (row[13] || 'pending') as PaymentStatus,
    kpay_reference: row[14] || undefined,
    order_created_at: row[15] || '',
    payment_confirmed_at: row[16] || undefined,
    email_sent: row[17] === 'TRUE',
    collected: row[18] === 'TRUE',
    collected_at: row[19] || undefined,
    collected_by: row[20] || undefined,
    notes: row[21] || undefined,
  }
}

/**
 * Maps an Order object to a row array for the orders sheet.
 */
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
    order.menu_item_id,
    order.menu_item_name,
    order.menu_item_emoji || '',
    order.lane,
    String(order.amount_hkd),
    order.payment_status,
    order.kpay_reference || '',
    order.order_created_at,
    order.payment_confirmed_at || '',
    order.email_sent ? 'TRUE' : 'FALSE',
    order.collected ? 'TRUE' : 'FALSE',
    order.collected_at || '',
    order.collected_by || '',
    order.notes || '',
  ]
}

/**
 * Maps a row from the menu sheet to a MenuItem object.
 */
function rowToMenuItem(row: string[]): MenuItem {
  return {
    item_id: row[0] || '',
    menu_month: row[1] || '',
    item_name: row[2] || '',
    description: row[3] || '',
    emoji: row[4] || '',
    lane: (row[5] || 'A') as Lane,
    price_hkd: Number(row[6]) || 0,
    days_in_month: Number(row[7]) || 0,
    total_price_hkd: Number(row[8]) || 0,
    is_active: row[9] === 'TRUE',
    max_orders: Number(row[10]) || 0,
  }
}

/**
 * Maps a CollectionLog object to a row array.
 */
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

/**
 * Fetch all orders for a given month.
 */
export async function getOrders(month: string): Promise<Order[]> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDERS}!A2:V`,
  })

  const rows = res.data.values || []
  return rows
    .map(row => rowToOrder(row))
    .filter(order => order.menu_month === month)
}

/**
 * Look up a single order by its QR token.
 */
export async function getOrderByToken(token: string): Promise<Order | null> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDERS}!A2:V`,
  })

  const rows = res.data.values || []
  const row = rows.find(r => r[1] === token)
  return row ? rowToOrder(row) : null
}

/**
 * Look up an order by child name, class, and month.
 * Only returns paid orders (pending orders older than 30 min are ignored).
 */
export async function getOrderByChild(
  name: string,
  cls: string,
  month: string
): Promise<Order | null> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDERS}!A2:V`,
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
      // Return paid orders immediately
      if (order.payment_status === 'paid') {
        return order
      }
      // Return pending orders only if created within the last 30 minutes
      if (
        order.payment_status === 'pending' &&
        order.order_created_at > thirtyMinAgo
      ) {
        return order
      }
    }
  }
  return null
}

/**
 * Look up a single order by order ID.
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDERS}!A2:V`,
  })

  const rows = res.data.values || []
  const row = rows.find(r => r[0] === orderId)
  return row ? rowToOrder(row) : null
}

/**
 * Append a new order to the orders sheet.
 */
export async function appendOrder(order: Order): Promise<void> {
  const sheets = getSheets()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDERS}!A:V`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [orderToRow(order)],
    },
  })
}

/**
 * Mark an order as collected by updating the row in-place.
 */
export async function markCollected(
  orderId: string,
  staffId: string
): Promise<void> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDERS}!A2:V`,
  })

  const rows = res.data.values || []
  const rowIndex = rows.findIndex(r => r[0] === orderId)

  if (rowIndex === -1) {
    throw new Error(`Order not found: ${orderId}`)
  }

  // Row index in the sheet is rowIndex + 2 (1-indexed + header row)
  const sheetRow = rowIndex + 2
  const now = new Date().toISOString()

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: `${SHEET_ORDERS}!S${sheetRow}`,
          values: [['TRUE']],
        },
        {
          range: `${SHEET_ORDERS}!T${sheetRow}`,
          values: [[now]],
        },
        {
          range: `${SHEET_ORDERS}!U${sheetRow}`,
          values: [[staffId]],
        },
      ],
    },
  })
}

/**
 * Update specific fields of an order by order ID.
 * Used by the webhook to set payment_status, kpay_reference, qr_token, etc.
 */
export async function updateOrder(
  orderId: string,
  updates: Partial<Order>
): Promise<void> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDERS}!A2:V`,
  })

  const rows = res.data.values || []
  const rowIndex = rows.findIndex(r => r[0] === orderId)

  if (rowIndex === -1) {
    throw new Error(`Order not found: ${orderId}`)
  }

  const sheetRow = rowIndex + 2
  const existing = rowToOrder(rows[rowIndex])
  const updated = { ...existing, ...updates }
  const updatedRow = orderToRow(updated)

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_ORDERS}!A${sheetRow}:V${sheetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [updatedRow],
    },
  })
}

// ─── Menu Functions ──────────────────────────────────────────────────────────

/**
 * Fetch active menu items for a given month.
 */
export async function getMenu(month: string): Promise<MenuItem[]> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_MENU}!A2:K`,
  })

  const rows = res.data.values || []
  return rows
    .map(row => rowToMenuItem(row))
    .filter(item => item.menu_month === month && item.is_active)
}

// ─── Collection Log Functions ────────────────────────────────────────────────

/**
 * Append an entry to the collection log sheet.
 */
export async function appendCollectionLog(log: CollectionLog): Promise<void> {
  const sheets = getSheets()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_COLLECTION_LOG}!A:J`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [collectionLogToRow(log)],
    },
  })
}

// ─── Utility Functions ───────────────────────────────────────────────────────

/**
 * Generate the next sequential order ID for a given month.
 * Format: ORD-YYYY-MM-NNNNN
 */
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
