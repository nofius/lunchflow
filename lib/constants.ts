export const ORDERING_CUTOFF_DAY = 25
export const STAFF_KEY = process.env.STAFF_KEY!

/**
 * Returns the month that parents are currently ordering for.
 * Before or on the 25th → orders are for next month.
 * After the 25th → ordering window is closed; returns next month
 * (but the ordering UI should block new orders).
 *
 * Format: YYYY-MM
 */
export function getCurrentOrderingMonth(): string {
  const now = new Date()
  // Orders placed before or on the 25th are for the following month
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  // Always target next month (ordering is for the upcoming month)
  const targetMonth = month + 1
  if (targetMonth > 11) {
    return `${year + 1}-01`
  }
  return `${year}-${String(targetMonth + 1).padStart(2, '0')}`
}

/**
 * Returns the current calendar month in YYYY-MM format.
 * Used by the scanner to check if a QR code is for the current month.
 */
export function getCurrentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-indexed
  return `${year}-${String(month).padStart(2, '0')}`
}

/**
 * Returns whether the ordering window is currently open.
 * Ordering is open from the 1st to the 25th of the current month
 * (for the following month's lunches).
 */
export function isOrderingOpen(): boolean {
  const now = new Date()
  return now.getDate() <= ORDERING_CUTOFF_DAY
}
