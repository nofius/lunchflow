'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isOrderingOpen, getCurrentOrderingMonth } from '@/lib/constants'

export default function OrderPage() {
  const router = useRouter()
  const orderingOpen = isOrderingOpen()
  const orderingMonth = getCurrentOrderingMonth()

  const [form, setForm] = useState({
    child_name: '',
    child_class: '',
    parent_name: '',
    parent_email: '',
    parent_phone: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Format month for display
  const [year, month] = orderingMonth.split('-')
  const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  // Restore form data from sessionStorage on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('lunchflow_child_details')
      if (saved) {
        try {
          setForm(JSON.parse(saved))
        } catch {
          // ignore
        }
      }
    }
  })

  if (!orderingOpen) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="text-4xl">🍱</div>
          <h1 className="mt-4 text-2xl font-bold text-zinc-900">Ordering Closed</h1>
          <p className="mt-2 text-zinc-600">
            Ordering for {monthName} is now closed. Orders open on the 1st of each month.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-medium text-zinc-600 underline"
          >
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate required fields
    if (!form.child_name.trim() || !form.child_class.trim() || !form.parent_name.trim() || !form.parent_email.trim()) {
      setError('Please fill in all required fields.')
      setLoading(false)
      return
    }

    try {
      // Check for duplicate order
      const params = new URLSearchParams({
        child_name: form.child_name.trim(),
        child_class: form.child_class.trim(),
        month: orderingMonth,
      })
      const res = await fetch(`/api/orders?${params}`)
      const data = await res.json()

      if (data.exists) {
        setError(
          `A lunch order for ${form.child_name.trim()} in ${monthName} already exists. Check your email for the QR code.`
        )
        setLoading(false)
        return
      }

      // Save to sessionStorage and proceed
      sessionStorage.setItem('lunchflow_child_details', JSON.stringify({
        ...form,
        child_name: form.child_name.trim(),
        child_class: form.child_class.trim(),
        parent_name: form.parent_name.trim(),
        parent_email: form.parent_email.trim(),
        parent_phone: form.parent_phone.trim(),
      }))
      sessionStorage.setItem('lunchflow_month', orderingMonth)

      router.push('/order/menu')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-8">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700">
          &larr; Back
        </Link>

        <div className="mt-6">
          <h1 className="text-2xl font-bold text-zinc-900">Order Lunch</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Ordering for <span className="font-medium text-zinc-700">{monthName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="child_name" className="block text-sm font-medium text-zinc-700">
              Child&apos;s full name <span className="text-red-500">*</span>
            </label>
            <input
              id="child_name"
              type="text"
              required
              value={form.child_name}
              onChange={e => setForm(f => ({ ...f, child_name: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              placeholder="e.g. Chan Mei Ling"
            />
          </div>

          <div>
            <label htmlFor="child_class" className="block text-sm font-medium text-zinc-700">
              Class / Form <span className="text-red-500">*</span>
            </label>
            <input
              id="child_class"
              type="text"
              required
              value={form.child_class}
              onChange={e => setForm(f => ({ ...f, child_class: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              placeholder="e.g. Form 2A"
            />
          </div>

          <div>
            <label htmlFor="parent_name" className="block text-sm font-medium text-zinc-700">
              Parent name <span className="text-red-500">*</span>
            </label>
            <input
              id="parent_name"
              type="text"
              required
              value={form.parent_name}
              onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              placeholder="e.g. Chan Wai Lam"
            />
          </div>

          <div>
            <label htmlFor="parent_email" className="block text-sm font-medium text-zinc-700">
              Parent email <span className="text-red-500">*</span>
            </label>
            <input
              id="parent_email"
              type="email"
              required
              value={form.parent_email}
              onChange={e => setForm(f => ({ ...f, parent_email: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              placeholder="e.g. parent@email.com"
            />
          </div>

          <div>
            <label htmlFor="parent_phone" className="block text-sm font-medium text-zinc-700">
              Parent phone <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              id="parent_phone"
              type="tel"
              value={form.parent_phone}
              onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              placeholder="e.g. +852 9123 4567"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 text-base font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Continue to Menu'}
          </button>
        </form>
      </div>
    </div>
  )
}
