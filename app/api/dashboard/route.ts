import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET: fetch everything the dashboard needs in a single round trip
// (transactions, budgets, bills, history, categories), instead of the
// frontend making 5 separate requests. Protected the same way as every
// other /api/* route: middleware.ts blocks unauthenticated requests
// before they ever reach this handler.
export async function GET() {
  const supabase = getSupabaseAdmin()

  const [txRes, budgetRes, billRes, historyRes, categoryRes] = await Promise.all([
    supabase.from('transactions').select('*').order('date', { ascending: false }),
    supabase.from('budgets').select('*').order('id'),
    supabase.from('bills').select('*').order('due'),
    supabase.from('history').select('*').order('created_at', { ascending: false }),
    supabase.from('categories').select('*').order('name'),
  ])

  const firstError = txRes.error || budgetRes.error || billRes.error || historyRes.error || categoryRes.error
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 })
  }

  // Reshape history to match the frontend's HistoryEntry type, same as /api/history does
  const history = (historyRes.data ?? []).map((row) => ({
    id: row.id,
    transactionId: row.transaction_id,
    action: row.action,
    changedFields: row.changed_fields,
    timestamp: row.created_at,
  }))

  return NextResponse.json({
    transactions: txRes.data ?? [],
    budgets: budgetRes.data ?? [],
    bills: billRes.data ?? [],
    history,
    categories: categoryRes.data ?? [],
  })
}