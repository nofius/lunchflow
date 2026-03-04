import { Resend } from 'resend'
import { generateQRImageBuffer } from './qr'

const resend = new Resend(process.env.RESEND_API_KEY!)

interface SendOrderConfirmationParams {
  to: string
  parentName: string
  childName: string
  childClass: string
  menuItemName: string
  menuMonth: string
  orderId: string
  qrToken: string
}

export async function sendOrderConfirmation(params: SendOrderConfirmationParams): Promise<void> {
  const { to, parentName, childName, childClass, menuItemName, menuMonth, orderId, qrToken } = params

  // Format month for display (e.g. "2025-04" → "April 2025")
  const [year, month] = menuMonth.split('-')
  const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const qrImageBuffer = await generateQRImageBuffer(qrToken)

  await resend.emails.send({
    from: 'LunchFlow <noreply@lunchflow.app>',
    to,
    subject: `LunchFlow — Your ${monthName} lunch order is confirmed`,
    attachments: [
      {
        filename: `lunchflow-qr-${childName.replace(/\s+/g, '-').toLowerCase()}-${menuMonth}.png`,
        content: qrImageBuffer,
      },
    ],
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 20px; color: #18181b;">Order Confirmed</h1>
        <p style="color: #52525b;">Hi ${parentName},</p>
        <p style="color: #52525b;">
          Your lunch order for <strong>${childName}</strong> has been confirmed.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 0; color: #71717a; border-bottom: 1px solid #e4e4e7;">Child</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #18181b; border-bottom: 1px solid #e4e4e7;">${childName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #71717a; border-bottom: 1px solid #e4e4e7;">Class</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #18181b; border-bottom: 1px solid #e4e4e7;">${childClass}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #71717a; border-bottom: 1px solid #e4e4e7;">Month</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #18181b; border-bottom: 1px solid #e4e4e7;">${monthName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #71717a; border-bottom: 1px solid #e4e4e7;">Meal</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #18181b; border-bottom: 1px solid #e4e4e7;">${menuItemName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #71717a;">Order ID</td>
            <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px; color: #71717a;">${orderId}</td>
          </tr>
        </table>

        <div style="text-align: center; margin: 24px 0;">
          <p style="font-weight: 600; color: #18181b; margin-bottom: 8px;">Your QR Code</p>
          <img
            src="cid:qr-code"
            alt="QR code for ${childName}, ${monthName}"
            width="280"
            height="280"
            style="border: 1px solid #e4e4e7; border-radius: 8px;"
          />
          <p style="font-size: 13px; color: #71717a; margin-top: 8px;">
            Show this at the canteen each lunch day.
            <br />
            The same QR code is valid for the entire month.
          </p>
        </div>

        <p style="font-size: 12px; color: #a1a1aa; margin-top: 24px;">
          The QR code is also attached as a PNG file you can save to your phone.
        </p>
      </div>
    `,
  })
}
