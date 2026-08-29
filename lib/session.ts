import { getIronSession, IronSession } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  isLoggedIn: boolean
  username?: string
  lastActive?: number
}

const sessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'ledgerly_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 30, // cookie itself can live 30 days,
                                 // but we enforce 8h inactivity below
  },
}

const INACTIVITY_LIMIT_MS = 8 * 60 * 60 * 1000 // 8 hours

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
  return session
}

export async function isSessionValid(session: IronSession<SessionData>): Promise<boolean> {
  if (!session.isLoggedIn) return false
  if (!session.lastActive) return false
  const elapsed = Date.now() - session.lastActive
  if (elapsed > INACTIVITY_LIMIT_MS) {
    session.destroy()
    return false
  }
  // refresh activity timestamp
  session.lastActive = Date.now()
  await session.save()
  return true
}