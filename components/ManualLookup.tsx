'use client'

import { useState, useRef, useEffect } from 'react'
import type { Order } from '@/types'

interface ManualLookupProps {
  open: boolean
  onClose: () => void
  currentMonth: string
  staffId: string
  onCollected: () => void
}

export default function ManualLookup({
  open,
  onClose,
  currentMonth,
  staffId,
  onCollected,
}: ManualLookupProps) {
  const [name, setName] = useState('')
  const [cls, setCls] = useState('')
  const [searching, setSearching] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [collecting, setCollecting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setCls('')
      setOrder(null)
      setError('')
      // Small delay so the drawer animation finishes before focusing
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [open])

  async function handleSearch() {
    if (!name.trim() || !cls.trim()) return
    setSearching(true)
    setError('')
    setOrder(null)

    try {
      const params = new URLSearchParams({ name: name.trim(), class: cls.trim(), month: currentMonth })
      const res = await fetch(`/api/orders?${params}`)
      if (!res.ok) {
        setError('No matching order found.')
        return
      }
      const data = await res.json()
      if (data.order) {
        setOrder(data.order)
      } else {
        setError('No matching order found.')
      }
    } catch {
      setError('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  async function handleCollect() {
    if (!order) return
    setCollecting(true)
    try {
      const res = await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.order_id, staff_id: staffId, manual: true }),
      })
      if (res.ok) {
        onCollected()
        onClose()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to mark as collected.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setCollecting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="relative z-10 w-full max-w-lg rounded-t-2xl bg-white px-6 pb-8 pt-4 shadow-xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-300" />
        <h2 className="mb-4 text-lg font-bold text-zinc-900">Manual Lookup</h2>

        <div className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            placeholder="Student name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-zinc-300 px-4 py-3 text-base text-zinc-900 outline-none focus:border-zinc-500"
          />
          <input
            type="text"
            placeholder="Class (e.g. Form 2A)"
            value={cls}
            onChange={(e) => setCls(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="rounded-lg border border-zinc-300 px-4 py-3 text-base text-zinc-900 outline-none focus:border-zinc-500"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || !name.trim() || !cls.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {searching ? 'Searching...' : 'Find'}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {order && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-lg font-bold text-zinc-900">
              {order.menu_item_emoji} {order.child_name}
            </p>
            <p className="text-sm text-zinc-500">
              {order.child_class} &middot; {order.menu_item_name} &middot; Lane {order.lane}
            </p>
            {order.collected ? (
              <p className="mt-3 text-sm font-medium text-orange-600">Already collected</p>
            ) : order.payment_status !== 'paid' ? (
              <p className="mt-3 text-sm font-medium text-red-600">Not paid</p>
            ) : (
              <button
                type="button"
                onClick={handleCollect}
                disabled={collecting}
                className="mt-3 w-full rounded-lg bg-green-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                {collecting ? 'Marking...' : 'Mark as Collected'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
