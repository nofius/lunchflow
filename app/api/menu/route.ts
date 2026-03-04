import { NextRequest, NextResponse } from 'next/server'
import { getMenu } from '@/lib/sheets'
import { getCurrentOrderingMonth } from '@/lib/constants'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const month = searchParams.get('month') || getCurrentOrderingMonth()

  try {
    const items = await getMenu(month)
    return NextResponse.json({ items, month })
  } catch (error) {
    console.error('Failed to fetch menu:', error)
    return NextResponse.json(
      { error: 'Failed to load menu' },
      { status: 500 }
    )
  }
}
