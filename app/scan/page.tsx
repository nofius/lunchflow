'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import ScanResult from '@/components/ScanResult'
import ManualLookup from '@/components/ManualLookup'
import type { ScanApiResponse, MenuItem } from '@/types'

// html5-qrcode accesses `window` so it must be client-only
const QRScanner = dynamic(() => import('@/components/QRScanner'), { ssr: false })

const AUTO_RESET_MS = 8_000
const STAFF_ID = 'staff-mvp' // MVP: single shared identity

export default function ScanPage() {
  const [scanData, setScanData] = useState<ScanApiResponse | null>(null)
  const [scanning, setScanning] = useState(true)
  const [collecting, setCollecting] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [lanes, setLanes] = useState<Pick<MenuItem, 'lane' | 'item_name' | 'emoji'>[]>([])
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(null)

  // Fetch today's lane info
  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7) // YYYY-MM
    fetch(`/api/menu?month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.items) {
          setLanes(
            data.items.map((i: MenuItem) => ({
              lane: i.lane,
              item_name: i.item_name,
              emoji: i.emoji,
            }))
          )
        }
      })
      .catch(() => {})
  }, [])

  const resetToScanning = useCallback(() => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
    setScanData(null)
    setScanning(true)
  }, [])

  const startAutoReset = useCallback(() => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(resetToScanning, AUTO_RESET_MS)
  }, [resetToScanning])

  const handleScan = useCallback(
    async (token: string) => {
      setScanning(false)

      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, staff_id: STAFF_ID }),
        })
        const data: ScanApiResponse = await res.json()
        setScanData(data)

        // Auto-reset for non-actionable states
        if (data.result !== 'ok') {
          startAutoReset()
        }
      } catch {
        setScanData({ result: 'invalid' })
        startAutoReset()
      }
    },
    [startAutoReset]
  )

  const handleCollect = useCallback(
    async (orderId: string) => {
      setCollecting(true)
      try {
        await fetch('/api/collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId, staff_id: STAFF_ID }),
        })
      } catch {
        // Proceed anyway — the scan was already logged
      }
      setCollecting(false)
      startAutoReset()
    },
    [startAutoReset]
  )

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const currentMonth = new Date().toISOString().slice(0, 7)

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between bg-white px-4 py-3 shadow-sm">
        <h1 className="text-lg font-bold text-zinc-900">LunchFlow Scanner</h1>
        <span className="text-sm tabular-nums text-zinc-500">{now}</span>
      </header>

      {/* Main */}
      <main className="flex flex-1 flex-col items-center gap-4 p-4">
        {/* Scanner or result */}
        <div className="w-full max-w-md">
          {scanData ? (
            <ScanResult
              data={scanData}
              onCollect={handleCollect}
              onNext={resetToScanning}
              collecting={collecting}
            />
          ) : (
            <QRScanner onScan={handleScan} paused={!scanning} />
          )}
        </div>

        {/* Manual lookup button */}
        {!scanData && (
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className="rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
          >
            Manual Lookup
          </button>
        )}
      </main>

      {/* Lanes footer */}
      {lanes.length > 0 && (
        <footer className="border-t border-zinc-200 bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Lanes today
          </p>
          <div className="flex flex-wrap gap-2">
            {lanes.map((l) => (
              <span
                key={l.lane}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700"
              >
                <span className="font-bold">[{l.lane}]</span> {l.emoji} {l.item_name}
              </span>
            ))}
          </div>
        </footer>
      )}

      {/* Manual lookup drawer */}
      <ManualLookup
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        currentMonth={currentMonth}
        staffId={STAFF_ID}
        onCollected={resetToScanning}
      />
    </div>
  )
}
