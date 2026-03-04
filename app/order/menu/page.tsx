'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MenuCard from '@/components/MenuCard'
import type { MenuItem } from '@/types'

function getSessionData() {
  if (typeof window === 'undefined') return null
  const details = sessionStorage.getItem('lunchflow_child_details')
  const month = sessionStorage.getItem('lunchflow_month')
  if (!details || !month) return null
  const savedSelection = sessionStorage.getItem('lunchflow_selected_item')
  let selection: MenuItem | null = null
  if (savedSelection) {
    try { selection = JSON.parse(savedSelection) } catch { /* ignore */ }
  }
  return { month, selection }
}

export default function MenuPage() {
  const router = useRouter()
  const [session] = useState(getSessionData)
  const [items, setItems] = useState<MenuItem[]>([])
  const [selected, setSelected] = useState<MenuItem | null>(session?.selection ?? null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const redirected = useRef(false)

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

  const handleContinue = () => {
    if (!selected) return
    sessionStorage.setItem('lunchflow_selected_item', JSON.stringify(selected))
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
          <h1 className="text-2xl font-bold text-zinc-900">Choose a Meal</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Menu for <span className="font-medium text-zinc-700">{monthName}</span>
          </p>
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
          <div className="mt-6 space-y-3">
            {items.map(item => (
              <MenuCard
                key={item.item_id}
                item={item}
                selected={selected?.item_id === item.item_id}
                onSelect={setSelected}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected}
          className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 text-base font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-30"
        >
          Continue to Payment
        </button>
      </div>
    </div>
  )
}
