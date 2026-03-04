import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getOrderById, getOrderDayForDate, markDayCollected, appendCollectionLog } from '@/lib/sheets'
import { getToday } from '@/lib/constants'
import type { CollectApiResponse, CollectionLog } from '@/types'

function makeLogId(): string {
  return `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export async function POST(req: NextRequest) {
  const { order_id, date, staff_id, manual } = await req.json()

  const collectDate = date || getToday()

  const order = await getOrderById(order_id)
  if (!order || order.payment_status !== 'paid') {
    return NextResponse.json(
      { success: false, error: 'Order not found' } satisfies CollectApiResponse,
      { status: 404 }
    )
  }

  const daySelection = await getOrderDayForDate(order_id, collectDate)
  if (!daySelection) {
    return NextResponse.json(
      { success: false, error: 'No meal ordered for this date' } satisfies CollectApiResponse,
      { status: 404 }
    )
  }

  if (daySelection.collected) {
    return NextResponse.json(
      { success: false, error: 'Already collected' } satisfies CollectApiResponse,
      { status: 409 }
    )
  }

  await markDayCollected(order_id, collectDate, staff_id)

  await appendCollectionLog({
    log_id: makeLogId(),
    scanned_at: new Date().toISOString(),
    order_id: order.order_id,
    qr_token_hash: order.qr_token
      ? crypto.createHash('sha256').update(order.qr_token).digest('hex').slice(0, 16)
      : '',
    child_name: order.child_name,
    child_class: order.child_class,
    menu_item_name: daySelection.item_name,
    result: manual ? 'collected_manual' : 'collected',
    staff_id,
  } satisfies CollectionLog)

  return NextResponse.json({ success: true } satisfies CollectApiResponse)
}
