'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { MenuItem } from '@/types'

interface ChildDetails {
  child_name: string
  child_class: string
  parent_name: string
  parent_email: string
  parent_phone: string
}

interface SessionData {
  details: ChildDetails
  item: MenuItem
  month: string
}

function getSessionData(): SessionData | null {
  if (typeof window === 'undefined') return null
  const savedDetails = sessionStorage.getItem('lunchflow_child_details')
  const savedItem = sessionStorage.getItem('lunchflow_selected_item')
  const savedMonth = sessionStorage.getItem('lunchflow_month')
  if (!savedDetails || !savedItem || !savedMonth) return null
  return {
    details: JSON.parse(savedDetails),
    item: JSON.parse(savedItem),
    month: savedMonth,
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

  const { details, item, month } = session ?? { details: null, item: null, month: '' }

  // Format month for display
  const monthName = month
    ? new Date(Number(month.split('-')[0]), Number(month.split('-')[1]) - 1).toLocaleDateString(
        'en-US',
        { month: 'long', year: 'numeric' }
      )
    : ''

  const handlePay = async () => {
    if (!details || !item) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/kpay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_name: details.child_name,
          child_class: details.child_class,
          parent_name: details.parent_name,
          parent_email: details.parent_email,
          parent_phone: details.parent_phone,
          menu_item_id: item.item_id,
          menu_month: month,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Payment initiation failed. Please try again.')
        setLoading(false)
        return
      }

      // Store order_id for confirmation page fallback
      sessionStorage.setItem('lunchflow_order_id', data.order_id)

      // Redirect to KPay payment page
      window.location.href = data.payment_url
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (!details || !item) {
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
          <p className="mt-1 text-sm text-zinc-500">Review your order before payment</p>
        </div>

        {cancelled && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Payment was cancelled. You can try again below.
          </div>
        )}

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Child</span>
              <span className="font-medium text-zinc-900">{details.child_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Class</span>
              <span className="font-medium text-zinc-900">{details.child_class}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Month</span>
              <span className="font-medium text-zinc-900">{monthName}</span>
            </div>
            <hr className="border-zinc-100" />
            <div className="flex justify-between">
              <span className="text-zinc-500">Meal</span>
              <span className="font-medium text-zinc-900">
                {item.emoji} {item.item_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Schedule</span>
              <span className="text-zinc-700">
                {item.days_in_month} days × HKD {item.price_hkd}
              </span>
            </div>
            <hr className="border-zinc-100" />
            <div className="flex justify-between text-base">
              <span className="font-medium text-zinc-900">Total</span>
              <span className="font-bold text-zinc-900">HKD {item.total_price_hkd}</span>
            </div>
          </div>
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
          {loading ? 'Processing...' : `Pay HKD ${item.total_price_hkd} with KPay`}
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
