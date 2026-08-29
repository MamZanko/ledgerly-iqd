import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

async function logHistory(
  transactionId: number,
  action: 'created' | 'edited' | 'deleted' | 'restored',
  changedFields: Record<string, { old: any; new: any }> | null = null
) {
  const supabase = getSupabaseAdmin()
  await supabase.from('history').insert({
    transaction_id: transactionId,
    action,
    description: `Transaction ${action}`,
    changed_fields: changedFields,
  })
}

// GET: list all transactions
export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// POST: create a new transaction
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { merchant, category, amount, date, type } = body

  if (!merchant?.trim() || !amount || Number(amount) <= 0 || !date || !type) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      merchant: merchant.trim(),
      category,
      amount: Number(amount),
      date,
      type,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logHistory(data.id, 'created', {
    merchant: { old: '', new: data.merchant },
    category: { old: '', new: data.category },
    amount: { old: 0, new: data.amount },
    date: { old: '', new: data.date },
    type: { old: '', new: data.type },
  })

  return NextResponse.json(data)
}