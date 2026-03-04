'use client'

import type { MenuItem } from '@/types'

interface MenuCardProps {
  item: MenuItem
  selected: boolean
  onSelect: (item: MenuItem) => void
}

export default function MenuCard({ item, selected, onSelect }: MenuCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
        selected
          ? 'border-zinc-900 bg-zinc-50 shadow-sm'
          : 'border-zinc-200 bg-white hover:border-zinc-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{item.emoji}</span>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-zinc-900">{item.item_name}</h3>
          <p className="mt-1 text-sm text-zinc-500">{item.description}</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-bold text-zinc-900">
              HKD {item.total_price_hkd}
            </span>
            <span className="text-xs text-zinc-400">
              ({item.days_in_month} days × HKD {item.price_hkd}/day)
            </span>
          </div>
        </div>
        <div
          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            selected ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300'
          }`}
        >
          {selected && (
            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
              <path d="M10.28 2.28a.75.75 0 00-1.06-1.06L4.5 5.94 2.78 4.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l5.25-5.25z" />
            </svg>
          )}
        </div>
      </div>
    </button>
  )
}
