import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { SessionData } from '@/lib/session'

const sessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'ledgerly_session',
}

const PUBLIC_PATHS = ['/login', '/api/login']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always allow the login page, login API, and Next.js internals/static files
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
  
  const valid = isLoggedIn && inactiveMs < THIRTY_MINUTES

  if (!valid) {
    // Protect page routes by redirecting; protect API routes with a 401
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