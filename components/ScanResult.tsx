'use client'

import type { ScanApiResponse, Lane } from '@/types'

interface ScanResultProps {
  data: ScanApiResponse
  onCollect: (orderId: string) => void
  onNext: () => void
  collecting: boolean
}

const laneBg: Record<Lane, string> = {
  A: 'bg-red-500',
  B: 'bg-blue-500',
  C: 'bg-green-500',
  D: 'bg-amber-500',
}

export default function ScanResult({ data, onCollect, onNext, collecting }: ScanResultProps) {
  if (data.result === 'ok') {
    return (
      <div className="rounded-2xl border-4 border-green-400 bg-white p-6 text-center shadow-lg">
        <p className="text-4xl">{data.menu_item_emoji}</p>
        <h2 className="mt-2 text-2xl font-bold text-zinc-900">{data.child_name}</h2>
        <p className="text-lg text-zinc-500">{data.child_class}</p>
        <p className="mt-2 text-lg text-zinc-700">{data.menu_item_name}</p>

        <div className="mt-4 flex justify-center">
          <span
            className={`${laneBg[data.lane]} inline-block rounded-lg px-8 py-3 text-2xl font-black tracking-widest text-white`}
          >
            LANE {data.lane}
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onCollect(data.order_id)}
            disabled={collecting}
            className="rounded-xl bg-green-600 px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {collecting ? 'Marking...' : 'Mark as Collected'}
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-xl border border-zinc-300 px-6 py-3 text-lg font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            Next student
          </button>
        </div>
      </div>
    )
  }

  if (data.result === 'already_collected') {
    const time = new Date(data.collected_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
    return (
      <div className="rounded-2xl border-4 border-orange-400 bg-white p-6 text-center shadow-lg">
        <p className="text-4xl">&#9888;&#65039;</p>
        <h2 className="mt-2 text-2xl font-bold text-zinc-900">{data.child_name}</h2>
        <p className="text-lg text-zinc-500">{data.child_class}</p>
        <p className="mt-2 text-base text-orange-600">Already collected at {time}</p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onNext}
            className="rounded-xl border border-zinc-300 px-6 py-3 text-lg font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            Next student
          </button>
        </div>
      </div>
    )
  }

  if (data.result === 'no_meal_today') {
    return (
      <div className="rounded-2xl border-4 border-orange-400 bg-white p-6 text-center shadow-lg">
        <p className="text-4xl">&#128276;</p>
        <h2 className="mt-2 text-2xl font-bold text-zinc-900">{data.child_name}</h2>
        <p className="text-lg text-zinc-500">{data.child_class}</p>
        <p className="mt-2 text-base text-orange-600">No meal ordered for today</p>
        <div className="mt-6">
          <button
            type="button"
            onClick={onNext}
            className="rounded-xl border border-zinc-300 px-6 py-3 text-lg font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            Next student
          </button>
        </div>
      </div>
    )
  }

  if (data.result === 'wrong_month') {
    return (
      <div className="rounded-2xl border-4 border-red-400 bg-white p-6 text-center shadow-lg">
        <p className="text-4xl">&#10060;</p>
        <h2 className="mt-2 text-xl font-bold text-zinc-900">Wrong Month</h2>
        <p className="mt-1 text-base text-zinc-500">
          Expected <strong>{data.expected}</strong>, got <strong>{data.got}</strong>
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={onNext}
            className="rounded-xl border border-zinc-300 px-6 py-3 text-lg font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // invalid or unpaid
  return (
    <div className="rounded-2xl border-4 border-red-400 bg-white p-6 text-center shadow-lg">
      <p className="text-4xl">&#10060;</p>
      <h2 className="mt-2 text-xl font-bold text-zinc-900">
        {data.result === 'unpaid' ? 'Unpaid Order' : 'Invalid QR Code'}
      </h2>
      <p className="mt-1 text-base text-zinc-500">
        {data.result === 'unpaid'
          ? 'This order has not been paid yet.'
          : 'Cannot verify this student.'}
      </p>
      <div className="mt-6">
        <button
          type="button"
          onClick={onNext}
          className="rounded-xl border border-zinc-300 px-6 py-3 text-lg font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
