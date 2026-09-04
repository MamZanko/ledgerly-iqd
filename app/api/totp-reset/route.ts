import { NextRequest, NextResponse } from 'next/server'
import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'
import { getSupabaseAdmin } from '@/lib/supabase'

// One-time-use route to regenerate a user's TOTP secret and return a QR code to re-pair
// an authenticator app. Protected by a shared secret passed as a query param so it can't
// be triggered by just anyone who finds the URL.
//
// Usage: visit /api/totp-reset?username=zanko&key=YOUR_SESSION_SECRET in the browser.
// Scan the returned QR code image with Authy, then delete this file and redeploy.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')
  const key = searchParams.get('key')

  if (!key || key !== process.env.SESSION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!username) {
    return NextResponse.json({ error: 'Missing username' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const secret = new OTPAuth.Secret({ size: 20 })

  const totp = new OTPAuth.TOTP({
    issuer: 'Ledgerly',
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  })

  const { error } = await supabase
    .from('admin_user')
    .update({ totp_secret: secret.base32 })
    .eq('username', username)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const otpauthUrl = totp.toString()
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl)

  const html = `
    <html>
      <body style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h2>Scan this with Authy</h2>
        <p>Then delete the file <code>app/api/totp-reset/route.ts</code> and redeploy.</p>
        <img src="${qrDataUrl}" alt="QR code" />
        <p>Can't scan? Manual key: <code>${secret.base32}</code></p>
      </body>
    </html>
  `

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
}