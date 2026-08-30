import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import * as OTPAuth from 'otpauth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { username, password, code } = await req.json()

  if (!username || !password || !code) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const { data: user, error } = await supabase
    .from('admin_user')
    .select('username, password_hash, totp_secret, session_version')
    .eq('username', username)
    .single()

  // Generic error message on purpose — don't reveal whether the username exists
  const invalidResponse = () =>
    NextResponse.json({ error: 'Invalid username, password, or code' }, { status: 401 })

  if (error || !user) {
    return invalidResponse()
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash)
  if (!passwordOk) {
    return invalidResponse()
  }

  if (!user.totp_secret) {
    return NextResponse.json({ error: 'TOTP not configured' }, { status: 500 })
  }

  const totp = new OTPAuth.TOTP({
    issuer: 'Ledgerly',
    label: user.username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: user.totp_secret,
  })

  // window: 1 allows the previous/next 30s code too, to tolerate clock drift
  const delta = totp.validate({ token: code, window: 1 })
  if (delta === null) {
    return invalidResponse()
  }

  const now = new Date().toISOString()
  await supabase.from('admin_user').update({ last_login_at: now }).eq('username', user.username)

  const session = await getSession()
  session.isLoggedIn = true
  session.username = user.username
  session.lastActive = Date.now()
  session.sessionVersion = user.session_version
  await session.save()

  return NextResponse.json({ success: true })
}