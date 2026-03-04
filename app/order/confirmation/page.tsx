'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import QRDisplay from '@/components/QRDisplay'
import type { Order } from '@/types'

function getInitialOrderId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('lunchflow_order_id')
}

function ConfirmationContent() {
  const searchParams = useSearchParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [pollCount, setPollCount] = useState(0)
  const urlOrderId = searchParams.get('order_id')
  const [sessionOrderId] = useState(getInitialOrderId)
  const resolvedId = urlOrderId || sessionOrderId
  const hasId = !!resolvedId
  const [done, setDone] = useState(false)
  const pollingRef = useRef(false)

  const fetchOrder = useCallback(async (id: string): Promise<Order | null> => {
    const res = await fetch(`/api/orders?order_id=${encodeURIComponent(id)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.order || null
  }, [])

  useEffect(() => {
    if (!resolvedId || pollingRef.current) return
    pollingRef.current = true

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>

    const poll = async (attempt: number) => {
      if (cancelled || attempt >= 15) {
        if (!cancelled) setDone(true)
        return
      }

      try {
        const fetched = await fetchOrder(resolvedId)
        if (cancelled) return

        if (fetched && fetched.payment_status === 'paid') {
          setOrder(fetched)
          setDone(true)
          sessionStorage.removeItem('lunchflow_child_details')
          sessionStorage.removeItem('lunchflow_selected_item')
          sessionStorage.removeItem('lunchflow_month')
          sessionStorage.removeItem('lunchflow_order_id')
          return
        }

        setPollCount(attempt + 1)
        timeoutId = setTimeout(() => poll(attempt + 1), 2000)
      } catch {
        if (!cancelled) {
          timeoutId = setTimeout(() => poll(attempt + 1), 2000)
        }
      }
    }

    poll(0)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [resolvedId, fetchOrder])

  // Format month for display
  const monthName = order?.menu_month
    ? new Date(
        Number(order.menu_month.split('-')[0]),
        Number(order.menu_month.split('-')[1]) - 1
      ).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : ''

  // No order ID at all
  if (!hasId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="text-4xl">⚠️</div>
          <h1 className="mt-4 text-xl font-bold text-zinc-900">No Order Found</h1>
          <p className="mt-2 text-sm text-zinc-500">
            We couldn&apos;t find an order to confirm.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-zinc-600 underline">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  // Still polling
  if (!done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-800" />
          <h1 className="mt-6 text-xl font-bold text-zinc-900">Confirming Payment</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Waiting for payment confirmation... ({pollCount}/15)
          </p>
        </div>
      </div>
    )
  }

  // Polling done but no paid order
  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="text-4xl">⚠️</div>
          <h1 className="mt-4 text-xl font-bold text-zinc-900">Payment Not Confirmed</h1>
          <p className="mt-2 text-sm text-zinc-500">
            We couldn&apos;t confirm your payment. If you completed the payment, your confirmation email
            with the QR code will arrive shortly.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-zinc-600 underline">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  // Payment confirmed
  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
            ✅
          </div>
          <h1 className="mt-4 text-2xl font-bold text-zinc-900">Order Confirmed!</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Lunch for {monthName} is all set.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Child</span>
              <span className="font-medium text-zinc-900">{order.child_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Class</span>
              <span className="font-medium text-zinc-900">{order.child_class}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Meal</span>
              <span className="font-medium text-zinc-900">
                {order.menu_item_emoji} {order.menu_item_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Amount</span>
              <span className="font-medium text-zinc-900">HKD {order.amount_hkd}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Order ID</span>
              <span className="font-mono text-xs text-zinc-500">{order.order_id}</span>
            </div>
          </div>
        </div>

        {order.qr_token && (
          <div className="mt-6">
            <h2 className="text-center text-lg font-semibold text-zinc-900">Your QR Code</h2>
            <p className="mt-1 text-center text-xs text-zinc-500">
              Show this at the canteen each lunch day
            </p>
            <div className="mt-4">
              <QRDisplay
                token={order.qr_token}
                childName={order.child_name}
                menuMonth={order.menu_month}
              />
            </div>
          </div>
        )}

        <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          Your child should show this QR code at the canteen each lunch day. The same QR code is
          valid for the entire month of {monthName}.
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm font-medium text-zinc-600 underline">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
          <div className="text-zinc-500">Loading...</div>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  )
}
