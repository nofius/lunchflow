import Link from 'next/link'
import { isOrderingOpen, getCurrentOrderingMonth } from '@/lib/constants'

export default function Home() {
  const orderingOpen = isOrderingOpen()
  const orderingMonth = getCurrentOrderingMonth()

  // Format month for display (e.g. "2025-04" → "April 2025")
  const [year, month] = orderingMonth.split('-')
  const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 font-sans">
      <main className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <div className="text-5xl">🍱</div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          LunchFlow
        </h1>
        <p className="text-lg text-zinc-600">
          School lunch ordering made simple.
          <br />
          Order online, collect with a QR code.
        </p>

        {orderingOpen ? (
          <div className="flex w-full flex-col items-center gap-4">
            <p className="text-sm text-zinc-500">
              Now ordering for <span className="font-semibold text-zinc-700">{monthName}</span>
            </p>
            <Link
              href="/order"
              className="inline-flex h-12 w-full max-w-xs items-center justify-center rounded-full bg-zinc-900 px-6 text-base font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Order Lunch
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Ordering for {monthName} is now closed. Orders open on the 1st of each month.
          </div>
        )}
      </main>
    </div>
  )
}
