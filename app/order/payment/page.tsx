'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { MenuScheduleDay } from '@/types'

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

interface SessionData {
  order: OrderSession
  selectionDetails: Record<number, { date: string; item: MenuScheduleDay }[]>
  pricePerDay: number
  month: string
}

function getSessionData(): SessionData | null {
  if (typeof window === 'undefined') return null
  const rawOrder = sessionStorage.getItem('lunchflow_order')
  const rawDetails = sessionStorage.getItem('lunchflow_selection_details')
  const priceStr = sessionStorage.getItem('lunchflow_price_per_day')
  const month = sessionStorage.getItem('lunchflow_month')
  if (!rawOrder || !rawDetails || !month) return null
  return {
    order: JSON.parse(rawOrder),
    selectionDetails: JSON.parse(rawDetails),
    pricePerDay: Number(priceStr) || 0,
    month,
  }
}

function PaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [session] = useState(getSessionData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const cancelled = searchParams.get('cancelled') === 'true'
  const redirected = useRef(false)

  useEffect(() => {
    if (!session && !redirected.current) {
      redirected.current = true
      router.replace('/order')
    }
  }, [router, session])

  const order = session?.order ?? null
  const details = session?.selectionDetails ?? {}
  const pricePerDay = session?.pricePerDay ?? 0
  const month = session?.month ?? ''
  const children = order?.children ?? []

  // Build line items: one per child
  const lineItems = children.map((child, i) => {
    const days = details[i] || []
    return { child, days, subtotal: days.length * pricePerDay }
  })

  const grandTotal = lineItems.reduce((sum, li) => sum + li.subtotal, 0)

  const monthName = month
    ? new Date(Number(month.split('-')[0]), Number(month.split('-')[1]) - 1).toLocaleDateString(
        'en-US',
        { month: 'long', year: 'numeric' }
      )
    : ''

  const handlePay = async () => {
    if (!order) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/kpay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_name: order.parentName,
          parent_email: order.parentEmail,
          parent_phone: order.parentPhone,
          menu_month: month,
          children: lineItems.map((li) => ({
            child_name: li.child.name,
            child_class: li.child.class,
            days: li.days.map((d) => ({
              date: d.date,
              item_id: d.item.item_id,
              item_name: d.item.item_name,
              emoji: d.item.emoji,
              lane: d.item.lane,
            })),
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Payment initiation failed. Please try again.')
        setLoading(false)
        return
      }

      sessionStorage.setItem(
        'lunchflow_order_ids',
        JSON.stringify(data.order_ids ?? [data.order_id])
      )
      window.location.href = data.payment_url
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (!order || lineItems.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-zinc-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-8">
      <div className="w-full max-w-md">
        <Link href="/order/menu" className="text-sm text-zinc-500 hover:text-zinc-700">
          &larr; Back to menu
        </Link>

        <div className="mt-6">
          <h1 className="text-2xl font-bold text-zinc-900">Order Summary</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {children.length} {children.length === 1 ? 'child' : 'children'} &middot; {monthName}
            &middot; HKD {pricePerDay}/day
          </p>
        </div>

        {cancelled && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Payment was cancelled. You can try again below.
          </div>
        )}

        {/* Per-child cards */}
        <div className="mt-6 space-y-4">
          {lineItems.map((li, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900">{li.child.name}</span>
                <span className="text-sm text-zinc-500">{li.child.class}</span>
              </div>
              <div className="mt-2 text-sm text-zinc-500">
                {li.days.length} days selected
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {li.days.slice(0, 8).map((d) => (
                  <span
                    key={d.date}
                    className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
                    title={`${d.date}: ${d.item.item_name}`}
                  >
                    {d.item.emoji} {new Date(d.date + 'T00:00:00').getDate()}
                  </span>
                ))}
                {li.days.length > 8 && (
                  <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-400">
                    +{li.days.length - 8} more
                  </span>
                )}
              </div>
              <div className="mt-3 flex justify-between text-sm font-medium">
                <span className="text-zinc-500">
                  {li.days.length}d &times; HKD {pricePerDay}
                </span>
                <span className="text-zinc-900">HKD {li.subtotal}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Grand total */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-zinc-900 px-5 py-4 text-white">
          <span className="text-base font-medium">Total</span>
          <span className="text-xl font-bold">HKD {grandTotal}</span>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handlePay}
          disabled={loading}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 text-base font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : `Pay HKD ${grandTotal} with KPay`}
        </button>

        <p className="mt-4 text-center text-xs text-zinc-400">
          You will be redirected to KPay to complete payment securely.
        </p>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
          <div className="text-zinc-500">Loading...</div>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  )
}
