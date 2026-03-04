'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
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

interface SessionData {
  order: OrderSession
  selections: Record<number, MenuItem>
  month: string
}

function getSessionData(): SessionData | null {
  if (typeof window === 'undefined') return null
  const rawOrder = sessionStorage.getItem('lunchflow_order')
  const rawSel = sessionStorage.getItem('lunchflow_selections')
  const month = sessionStorage.getItem('lunchflow_month')
  if (!rawOrder || !rawSel || !month) return null
  return {
    order: JSON.parse(rawOrder),
    selections: JSON.parse(rawSel),
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
  const selections = session?.selections ?? {}
  const month = session?.month ?? ''
  const children = order?.children ?? []

  // Build line items: one per child
  const lineItems = children.map((child, i) => ({
    child,
    item: selections[i] as MenuItem | undefined,
  }))

  const grandTotal = lineItems.reduce((sum, li) => sum + (li.item?.total_price_hkd ?? 0), 0)

  // Format month for display
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
      // Send all children as an array to the checkout API
      const res = await fetch('/api/kpay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_name: order.parentName,
          parent_email: order.parentEmail,
          parent_phone: order.parentPhone,
          menu_month: month,
          children: lineItems.map(li => ({
            child_name: li.child.name,
            child_class: li.child.class,
            menu_item_id: li.item!.item_id,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Payment initiation failed. Please try again.')
        setLoading(false)
        return
      }

      // Store order IDs for confirmation page
      sessionStorage.setItem('lunchflow_order_ids', JSON.stringify(data.order_ids ?? [data.order_id]))

      // Redirect to KPay payment page
      window.location.href = data.payment_url
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (!order || lineItems.some(li => !li.item)) {
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
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold text-zinc-900">{li.child.name}</span>
                  <span className="text-zinc-500">{li.child.class}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">
                    {li.item!.emoji} {li.item!.item_name}
                  </span>
                  <span className="text-zinc-700">
                    {li.item!.days_in_month}d &times; ${li.item!.price_hkd}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-zinc-500">Subtotal</span>
                  <span className="text-zinc-900">HKD {li.item!.total_price_hkd}</span>
                </div>
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
