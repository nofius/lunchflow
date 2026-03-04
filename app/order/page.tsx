'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isOrderingOpen, getCurrentOrderingMonth } from '@/lib/constants'

interface Child {
  name: string
  class: string
}

export default function OrderPage() {
  const router = useRouter()
  const orderingOpen = isOrderingOpen()
  const orderingMonth = getCurrentOrderingMonth()

  const [parentName, setParentName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [children, setChildren] = useState<Child[]>([{ name: '', class: '' }])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Format month for display
  const [year, month] = orderingMonth.split('-')
  const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  // Restore from sessionStorage on mount
  useState(() => {
    if (typeof window === 'undefined') return
    const saved = sessionStorage.getItem('lunchflow_order')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.parentName) setParentName(data.parentName)
        if (data.parentEmail) setParentEmail(data.parentEmail)
        if (data.parentPhone) setParentPhone(data.parentPhone)
        if (data.children?.length) setChildren(data.children)
      } catch { /* ignore */ }
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
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-zinc-600 underline">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  const addChild = () => {
    setChildren(c => [...c, { name: '', class: '' }])
  }

  const removeChild = (index: number) => {
    setChildren(c => c.filter((_, i) => i !== index))
  }

  const updateChild = (index: number, field: keyof Child, value: string) => {
    setChildren(c => c.map((ch, i) => (i === index ? { ...ch, [field]: value } : ch)))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const trimmedParent = parentName.trim()
    const trimmedEmail = parentEmail.trim()
    const trimmedChildren = children.map(c => ({ name: c.name.trim(), class: c.class.trim() }))

    if (!trimmedParent || !trimmedEmail) {
      setError('Please fill in your name and email.')
      setLoading(false)
      return
    }

    if (trimmedChildren.some(c => !c.name || !c.class)) {
      setError('Please fill in name and class for every child.')
      setLoading(false)
      return
    }

    // Check for duplicate names within this order
    const names = trimmedChildren.map(c => `${c.name.toLowerCase()}|${c.class.toLowerCase()}`)
    if (new Set(names).size !== names.length) {
      setError('Each child should only appear once.')
      setLoading(false)
      return
    }

    try {
      // Check for existing orders for each child
      for (const child of trimmedChildren) {
        const params = new URLSearchParams({
          child_name: child.name,
          child_class: child.class,
          month: orderingMonth,
        })
        const res = await fetch(`/api/orders?${params}`)
        const data = await res.json()
        if (data.exists) {
          setError(
            `A lunch order for ${child.name} (${child.class}) in ${monthName} already exists.`
          )
          setLoading(false)
          return
        }
      }

      // Save to sessionStorage and proceed
      sessionStorage.setItem(
        'lunchflow_order',
        JSON.stringify({
          parentName: trimmedParent,
          parentEmail: trimmedEmail,
          parentPhone: parentPhone.trim(),
          children: trimmedChildren,
        })
      )
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Parent details */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Parent / Guardian
            </legend>
            <div>
              <label htmlFor="parent_name" className="block text-sm font-medium text-zinc-700">
                Your name <span className="text-red-500">*</span>
              </label>
              <input
                id="parent_name"
                type="text"
                required
                value={parentName}
                onChange={e => setParentName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                placeholder="e.g. Chan Wai Lam"
              />
            </div>
            <div>
              <label htmlFor="parent_email" className="block text-sm font-medium text-zinc-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="parent_email"
                type="email"
                required
                value={parentEmail}
                onChange={e => setParentEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                placeholder="e.g. parent@email.com"
              />
            </div>
            <div>
              <label htmlFor="parent_phone" className="block text-sm font-medium text-zinc-700">
                Phone <span className="text-zinc-400">(optional)</span>
              </label>
              <input
                id="parent_phone"
                type="tel"
                value={parentPhone}
                onChange={e => setParentPhone(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                placeholder="e.g. +852 9123 4567"
              />
            </div>
          </fieldset>

          {/* Children */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Children
            </legend>

            {children.map((child, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-500">Child {i + 1}</span>
                  {children.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeChild(i)}
                      className="text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="mt-3 space-y-3">
                  <input
                    type="text"
                    required
                    value={child.name}
                    onChange={e => updateChild(i, 'name', e.target.value)}
                    className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                    placeholder="Child's full name"
                  />
                  <input
                    type="text"
                    required
                    value={child.class}
                    onChange={e => updateChild(i, 'class', e.target.value)}
                    className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                    placeholder="Class / Form (e.g. Form 2A)"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addChild}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add another child
            </button>
          </fieldset>

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
