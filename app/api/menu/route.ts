import { NextRequest, NextResponse } from 'next/server'
import { getMenuSchedule, getMenuItems } from '@/lib/sheets'
import { getCurrentOrderingMonth, PRICE_PER_DAY } from '@/lib/constants'
import type { DailyMenu } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const month = searchParams.get('month') || getCurrentOrderingMonth()

  try {
    const [schedule, items] = await Promise.all([
      getMenuSchedule(month),
      getMenuItems(),
    ])

    // Group schedule rows by date → DailyMenu[]
    const byDate = new Map<string, DailyMenu>()
    for (const row of schedule) {
      if (!byDate.has(row.date)) {
        const d = new Date(row.date + 'T00:00:00')
        byDate.set(row.date, {
          date: row.date,
          day_label: d.toLocaleDateString('en-US', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          }),
          items: [],
        })
      }
      byDate.get(row.date)!.items.push(row)
    }

    const days = Array.from(byDate.values())

    return NextResponse.json({
      days,
      items,
      month,
      price_per_day: PRICE_PER_DAY,
      total_days: days.length,
    })
  } catch (error) {
    console.error('Failed to fetch menu:', error)
    return NextResponse.json({ error: 'Failed to load menu' }, { status: 500 })
  }
}
