import { NextResponse } from 'next/server'
import { getSession, isSessionValid } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST() {
  const session = await getSession()
  const valid = await isSessionValid(session)
  if (!valid || !session.username) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const { data: user, error: fetchError } = await supabase
    .from('admin_user')
    .select('session_version')
    .eq('username', session.username)
    .single()

  if (fetchError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('admin_user')
    .update({ session_version: user.session_version + 1 })
    .eq('username', session.username)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  session.destroy()
  return NextResponse.json({ success: true })
}