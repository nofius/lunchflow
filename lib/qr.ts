import jwt from 'jsonwebtoken'
import QRCode from 'qrcode'

const QR_SECRET = process.env.QR_SECRET!

interface QRTokenPayload {
  order_id: string
  menu_month: string
}

/**
 * Generate a signed JWT token for a confirmed order.
 * The QR code image encodes this raw JWT string.
 */
export function generateQRToken(orderId: string, menuMonth: string): string {
  const payload: QRTokenPayload = { order_id: orderId, menu_month: menuMonth }
  return jwt.sign(payload, QR_SECRET, { algorithm: 'HS256' })
}

/**
 * Verify and decode a QR token.
 * Returns the payload if valid, or null if signature is invalid.
 */
export function verifyQRToken(token: string): QRTokenPayload | null {
  try {
    return jwt.verify(token, QR_SECRET, { algorithms: ['HS256'] }) as QRTokenPayload
  } catch {
    return null
  }
}

/**
 * Generate a QR code PNG image as a Buffer (for email attachments).
 */
export async function generateQRImageBuffer(token: string): Promise<Buffer> {
  return QRCode.toBuffer(token, {
    errorCorrectionLevel: 'M',
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  })
}
