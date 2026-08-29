import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET: list all history entries, most recent first
export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('history')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Reshape to match the frontend's HistoryEntry type
  const shaped = data.map((row) => ({
    id: row.id,
    transactionId: row.transaction_id,
    action: row.action,
    changedFields: row.changed_fields,
    timestamp: row.created_at,
  }))

  return NextResponse.json(shaped)
}
