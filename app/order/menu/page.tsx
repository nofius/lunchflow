'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MenuCard from '@/components/MenuCard'
import type { MenuItem } from '@/types'

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

function getSessionData(): { order: OrderSession; month: string; selections: Record<number, MenuItem> } | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem('lunchflow_order')
  const month = sessionStorage.getItem('lunchflow_month')
  if (!raw || !month) return null
  const order: OrderSession = JSON.parse(raw)
  let selections: Record<number, MenuItem> = {}
  const savedSel = sessionStorage.getItem('lunchflow_selections')
  if (savedSel) {
    try { selections = JSON.parse(savedSel) } catch { /* ignore */ }
  }
  return { order, month, selections }
}

export default function MenuPage() {
  const router = useRouter()
  const [session] = useState(getSessionData)
  const [items, setItems] = useState<MenuItem[]>([])
  const [selections, setSelections] = useState<Record<number, MenuItem>>(session?.selections ?? {})
  const [activeChild, setActiveChild] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const redirected = useRef(false)

  const children = session?.order.children ?? []

  useEffect(() => {
    if (!session) {
      if (!redirected.current) {
        redirected.current = true
        router.replace('/order')
      }
      return
    }

    fetch(`/api/menu?month=${session.month}`)
      .then(res => res.json())
      .then(data => {
        setItems(data.items || [])
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load menu. Please try again.')
        setLoading(false)
      })
  }, [router, session])

  const month = session?.month ?? ''

  // Format month for display
  const monthName = month
    ? new Date(Number(month.split('-')[0]), Number(month.split('-')[1]) - 1).toLocaleDateString(
        'en-US',
        { month: 'long', year: 'numeric' }
      )
    : ''

  const allSelected = children.length > 0 && children.every((_, i) => selections[i])

  const handleSelect = (item: MenuItem) => {
    setSelections(prev => ({ ...prev, [activeChild]: item }))
  }

  const handleContinue = () => {
    if (!allSelected) return
    sessionStorage.setItem('lunchflow_selections', JSON.stringify(selections))
    router.push('/order/payment')
  }

  if (!session || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-zinc-500">Loading menu...</div>
      </div>
    )
  }

  const selectedCount = Object.keys(selections).length

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-8">
      <div className="w-full max-w-md">
        <Link href="/order" className="text-sm text-zinc-500 hover:text-zinc-700">
          &larr; Back
        </Link>

        <div className="mt-6">
          <h1 className="text-2xl font-bold text-zinc-900">Choose Meals</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Menu for <span className="font-medium text-zinc-700">{monthName}</span>
            {children.length > 1 && (
              <span className="ml-1 text-zinc-400">
                &middot; {selectedCount}/{children.length} selected
              </span>
            )}
          </p>
        </div>

        {/* Child tabs (only shown for multiple children) */}
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
                    : selections[i]
                      ? 'bg-green-100 text-green-800'
                      : 'bg-zinc-200 text-zinc-600'
                }`}
              >
                {child.name || `Child ${i + 1}`}
                {selections[i] && activeChild !== i && ' \u2713'}
              </button>
            ))}
          </div>
        )}

        {/* Active child label */}
        <div className="mt-4 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
          Choosing for <span className="font-semibold text-zinc-900">{children[activeChild]?.name}</span>
          <span className="text-zinc-400"> ({children[activeChild]?.class})</span>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {items.length === 0 && !error ? (
          <div className="mt-8 text-center text-zinc-500">
            No menu items available for this month.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map(item => (
              <MenuCard
                key={item.item_id}
                item={item}
                selected={selections[activeChild]?.item_id === item.item_id}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleContinue}
          disabled={!allSelected}
          className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 text-base font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-30"
        >
          {allSelected
            ? 'Continue to Payment'
            : `Select meal for ${children.find((_, i) => !selections[i])?.name ?? 'all children'}`}
        </button>
      </div>
    </div>
  )
}
