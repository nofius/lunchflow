'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface QRDisplayProps {
  token: string
  childName: string
  menuMonth: string
}

export default function QRDisplay({ token, childName, menuMonth }: QRDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (canvasRef.current && token) {
      QRCode.toCanvas(canvasRef.current, token, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      }).catch(() => setError(true))
    }
  }, [token])

  const handleDownload = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(token, {
        width: 512,
        margin: 2,
      })
      const link = document.createElement('a')
      link.download = `lunchflow-qr-${childName.replace(/\s+/g, '-').toLowerCase()}-${menuMonth}.png`
      link.href = dataUrl
      link.click()
    } catch {
      // Ignore download errors
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to generate QR code. Please refresh the page.
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        className="rounded-lg border border-zinc-200"
        aria-label={`QR code for ${childName}, ${menuMonth}`}
      />
      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Download QR Code
      </button>
    </div>
  )
}
