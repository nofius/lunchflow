'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { DailyMenu, MenuScheduleDay } from '@/types'

interface ChildEntry {
  name: string
  class: string
}

interface OrderSession {
  parentName: string
  parentEmail: string
  parentPhone: string
  children: ChildEntry[]
}

// selections[childIndex][date] = item_id
type Selections = Record<number, Record<string, string>>

function getSessionData(): {
  order: OrderSession
  month: string
  selections: Selections
} | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem('lunchflow_order')
  const month = sessionStorage.getItem('lunchflow_month')
  if (!raw || !month) return null
  const order: OrderSession = JSON.parse(raw)
  let selections: Selections = {}
  const savedSel = sessionStorage.getItem('lunchflow_selections')
  if (savedSel) {
    try {
      selections = JSON.parse(savedSel)
    } catch {
      /* ignore */
    }
  }
  return { order, month, selections }
}

export default function MenuPage() {
  const router = useRouter()
  const [session] = useState(getSessionData)
  const [days, setDays] = useState<DailyMenu[]>([])
  const [pricePerDay, setPricePerDay] = useState(0)
  const [selections, setSelections] = useState<Selections>(session?.selections ?? {})
  const [activeChild, setActiveChild] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const redirected = useRef(false)

  const children = session?.order.children ?? []
  const month = session?.month ?? ''

  useEffect(() => {
    if (!session) {
      if (!redirected.current) {
        redirected.current = true
        router.replace('/order')
      }
      return
    }

    fetch(`/api/menu?month=${session.month}`)
      .then((res) => res.json())
      .then((data) => {
        setDays(data.days || [])
        setPricePerDay(data.price_per_day || 0)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load menu. Please try again.')
        setLoading(false)
      })
  }, [router, session])

  const monthName = month
    ? new Date(Number(month.split('-')[0]), Number(month.split('-')[1]) - 1).toLocaleDateString(
        'en-US',
        { month: 'long', year: 'numeric' }
      )
    : ''

  const selectItem = (date: string, itemId: string) => {
    setSelections((prev) => ({
      ...prev,
      [activeChild]: { ...prev[activeChild], [date]: itemId },
    }))
  }

  const clearDay = (date: string) => {
    setSelections((prev) => {
      const childSel = { ...prev[activeChild] }
      delete childSel[date]
      return { ...prev, [activeChild]: childSel }
    })
  }

  const selectAllForChild = () => {
    // Auto-select the first item on each unselected day
    setSelections((prev) => {
      const childSel = { ...prev[activeChild] }
      for (const day of days) {
        if (!childSel[day.date] && day.items.length > 0) {
          childSel[day.date] = day.items[0].item_id
        }
      }
      return { ...prev, [activeChild]: childSel }
    })
  }

  const clearAllForChild = () => {
    setSelections((prev) => ({ ...prev, [activeChild]: {} }))
  }

  // Count selected days per child
  const childDayCounts = children.map((_, i) => Object.keys(selections[i] || {}).length)
  const currentChildDays = childDayCounts[activeChild] || 0
  const anyChildHasSelections = childDayCounts.some((c) => c > 0)

  const handleContinue = () => {
    if (!anyChildHasSelections) return
    // Save selections and per-child day details to sessionStorage
    sessionStorage.setItem('lunchflow_selections', JSON.stringify(selections))

    // Build a summary: for each child, the full day selection objects
    const selectionDetails: Record<number, { date: string; item: MenuScheduleDay }[]> = {}
    for (let i = 0; i < children.length; i++) {
      const childSel = selections[i] || {}
      selectionDetails[i] = []
      for (const day of days) {
        const itemId = childSel[day.date]
        if (itemId) {
          const item = day.items.find((it) => it.item_id === itemId)
          if (item) selectionDetails[i].push({ date: day.date, item })
        }
      }
    }
    sessionStorage.setItem('lunchflow_selection_details', JSON.stringify(selectionDetails))
    sessionStorage.setItem('lunchflow_price_per_day', String(pricePerDay))

    router.push('/order/payment')
  }

  if (!session || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-zinc-500">Loading menu...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-8">
      <div className="w-full max-w-md">
        <Link href="/order" className="text-sm text-zinc-500 hover:text-zinc-700">
          &larr; Back
        </Link>

        <div className="mt-6">
          <h1 className="text-2xl font-bold text-zinc-900">Choose Meals</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {monthName} &middot; {days.length} school days &middot; HKD {pricePerDay}/day
          </p>
        </div>

        {/* Child tabs */}
        {children.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {children.map((child, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveChild(i)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeChild === i
                    ? 'bg-zinc-900 text-white'
                    : childDayCounts[i] > 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-zinc-200 text-zinc-600'
                }`}
              >
                {child.name || `Child ${i + 1}`}
                {childDayCounts[i] > 0 && activeChild !== i && ` (${childDayCounts[i]}d)`}
              </button>
            ))}
          </div>
        )}

        {/* Active child label + bulk actions */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2">
          <div className="text-sm text-zinc-600">
            <span className="font-semibold text-zinc-900">{children[activeChild]?.name}</span>
            <span className="text-zinc-400"> &middot; {currentChildDays}/{days.length} days</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllForChild}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
            >
              Select all
            </button>
            {currentChildDays > 0 && (
              <button
                type="button"
                onClick={clearAllForChild}
                className="text-xs font-medium text-red-500 hover:text-red-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {days.length === 0 && !error ? (
          <div className="mt-8 text-center text-zinc-500">No menu scheduled for this month yet.</div>
        ) : (
          <div className="mt-4 space-y-2">
            {days.map((day) => {
              const childSel = selections[activeChild] || {}
              const selectedId = childSel[day.date]
              const isSkipped = !selectedId

              return (
                <div
                  key={day.date}
                  className={`rounded-xl border p-3 transition-colors ${
                    isSkipped ? 'border-zinc-200 bg-white' : 'border-green-200 bg-green-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-900">{day.day_label}</span>
                    {!isSkipped && (
                      <button
                        type="button"
                        onClick={() => clearDay(day.date)}
                        className="text-xs text-zinc-400 hover:text-red-500"
                      >
                        Skip
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {day.items.map((item) => (
                      <button
                        key={item.item_id}
                        type="button"
                        onClick={() => selectItem(day.date, item.item_id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                          selectedId === item.item_id
                            ? 'bg-zinc-900 text-white'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                        }`}
                      >
                        <span>{item.emoji}</span>
                        <span>{item.item_name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Summary bar */}
        <div className="mt-6 rounded-xl bg-zinc-900 px-4 py-3 text-white">
          <div className="flex items-center justify-between text-sm">
            <span>
              {children.length > 1 ? 'All children' : children[0]?.name}
            </span>
            <span className="font-bold">
              HKD {childDayCounts.reduce((sum, c) => sum + c * pricePerDay, 0)}
            </span>
          </div>
          {children.length > 1 && (
            <div className="mt-1 text-xs text-zinc-400">
              {children.map((c, i) => `${c.name}: ${childDayCounts[i]}d`).join(' · ')}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!anyChildHasSelections}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 text-base font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-30"
        >
          Continue to Payment
        </button>
      </div>
    </div>
  )
}
