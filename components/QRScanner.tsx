'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'

interface QRScannerProps {
  onScan: (decodedText: string) => void
  paused: boolean
}

export default function QRScanner({ onScan, paused }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  const initScanner = useCallback(() => {
    if (!containerRef.current) return

    // Clear any previous scanner instance
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {})
      scannerRef.current = null
    }

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 280, height: 280 },
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      },
      false
    )

    scanner.render(
      (decodedText) => {
        scanner.pause()
        onScanRef.current(decodedText)
      },
      () => {
        // Ignore scan errors — they fire constantly until a code is read
      }
    )

    scannerRef.current = scanner
  }, [])

  useEffect(() => {
    initScanner()
    return () => {
      scannerRef.current?.clear().catch(() => {})
    }
  }, [initScanner])

  useEffect(() => {
    if (!paused && scannerRef.current) {
      try {
        scannerRef.current.resume()
      } catch {
        // Scanner may not be in paused state — reinitialize
        initScanner()
      }
    }
  }, [paused, initScanner])

  return (
    <div className="relative w-full">
      <div id="qr-reader" ref={containerRef} className="w-full overflow-hidden rounded-xl" />
    </div>
  )
}
