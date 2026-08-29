import { NextResponse } from 'next/server'
import { getSession, isSessionValid } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  const valid = await isSessionValid(session)
  if (!valid) {
    return NextResponse.json({ loggedIn: false }, { status: 401 })
  }
  return NextResponse.json({ loggedIn: true, username: session.username })
}