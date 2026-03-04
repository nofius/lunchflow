import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { verifyQRToken } from '@/lib/qr'
import { getOrderById, getOrderDayForDate, appendCollectionLog } from '@/lib/sheets'
import { getCurrentMonth, getToday } from '@/lib/constants'
import type { CollectionLog, ScanApiResponse } from '@/types'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16)
}

function makeLogId(): string {
  return `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export async function POST(req: NextRequest) {
  const { token, staff_id, device_id } = await req.json()

  // 1. Verify JWT signature
  const payload = verifyQRToken(token)
  if (!payload) {
    await appendCollectionLog({
      log_id: makeLogId(),
      scanned_at: new Date().toISOString(),
      qr_token_hash: hashToken(token),
      result: 'invalid',
      staff_id,
      device_id,
    } satisfies CollectionLog)
    return NextResponse.json({ result: 'invalid' } satisfies ScanApiResponse)
  }

  // 2. Check month
  const currentMonth = getCurrentMonth()
  if (payload.menu_month !== currentMonth) {
    return NextResponse.json({
      result: 'wrong_month',
      expected: currentMonth,
      got: payload.menu_month,
    } satisfies ScanApiResponse)
  }

  // 3. Fetch order
  const order = await getOrderById(payload.order_id)
  if (!order) {
    return NextResponse.json({ result: 'invalid' } satisfies ScanApiResponse)
  }

  // 4. Check payment
  if (order.payment_status !== 'paid') {
    return NextResponse.json({ result: 'unpaid' } satisfies ScanApiResponse)
  }

  // 5. Look up today's meal selection from order_days
  const today = getToday()
  const daySelection = await getOrderDayForDate(order.order_id, today)

  const logBase = {
    log_id: makeLogId(),
    scanned_at: new Date().toISOString(),
    order_id: order.order_id,
    qr_token_hash: hashToken(token),
    child_name: order.child_name,
    child_class: order.child_class,
    menu_item_name: daySelection?.item_name,
    staff_id,
    device_id,
  }

  // 6. No meal ordered for today (parent skipped this day)
  if (!daySelection) {
    await appendCollectionLog({ ...logBase, result: 'no_meal_today' } satisfies CollectionLog)
    return NextResponse.json({
      result: 'no_meal_today',
      child_name: order.child_name,
      child_class: order.child_class,
    } satisfies ScanApiResponse)
  }

  // 7. Check already collected today
  if (daySelection.collected) {
    await appendCollectionLog({ ...logBase, result: 'already_collected' } satisfies CollectionLog)
    return NextResponse.json({
      result: 'already_collected',
      child_name: order.child_name,
      child_class: order.child_class,
      collected_at: daySelection.collected_at!,
    } satisfies ScanApiResponse)
  }

  // 8. Success — return today's meal details (do NOT mark collected yet)
  await appendCollectionLog({ ...logBase, result: 'scanned_ok' } satisfies CollectionLog)
  return NextResponse.json({
    result: 'ok',
    order_id: order.order_id,
    date: today,
    child_name: order.child_name,
    child_class: order.child_class,
    menu_item_name: daySelection.item_name,
    menu_item_emoji: daySelection.emoji,
    lane: daySelection.lane,
  } satisfies ScanApiResponse)
}
