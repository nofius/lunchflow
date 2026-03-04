import { NextRequest, NextResponse } from 'next/server'
import { getOrderByChild, getOrderById } from '@/lib/sheets'
import { getCurrentOrderingMonth } from '@/lib/constants'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  // Lookup by order_id (used by confirmation page)
  const orderId = searchParams.get('order_id')
  if (orderId) {
    try {
      const order = await getOrderById(orderId)
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
      return NextResponse.json({ order })
    } catch (error) {
      console.error('Failed to fetch order:', error)
      return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
    }
  }

  // Lookup by child name + class + month (used for duplicate check)
  const childName = searchParams.get('child_name')
  const childClass = searchParams.get('child_class')
  const month = searchParams.get('month') || getCurrentOrderingMonth()

  if (!childName || !childClass) {
    return NextResponse.json(
      { error: 'Missing required parameters: child_name, child_class' },
      { status: 400 }
    )
  }

  try {
    const existingOrder = await getOrderByChild(childName, childClass, month)
    return NextResponse.json({ exists: !!existingOrder })
  } catch (error) {
    console.error('Failed to check order:', error)
    return NextResponse.json({ error: 'Failed to check order' }, { status: 500 })
  }
}
