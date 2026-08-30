import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { SessionData } from '@/lib/session'
import { createClient } from '@supabase/supabase-js'

const sessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'ledgerly_session',
}

const PUBLIC_PATHS = ['/login', '/api/login']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  const res = NextResponse.next()
  const session = await getIronSession<SessionData>(req, res, sessionOptions)

  const isLoggedIn = session.isLoggedIn === true
  const lastActive = session.lastActive ?? 0
  const inactiveMs = Date.now() - lastActive
  const THIRTY_MINUTES = 30 * 60 * 1000

  let versionValid = true
  if (isLoggedIn && session.username) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      )
      const { data } = await supabase
        .from('admin_user')
        .select('session_version')
        .eq('username', session.username)
        .single()

      if (data && data.session_version !== session.sessionVersion) {
        versionValid = false
      }
    } catch {
      // If the check itself fails, don't lock the person out over a network hiccup
      versionValid = true
    }
  }

  const valid = isLoggedIn && inactiveMs < THIRTY_MINUTES && versionValid

  if (!valid) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}