import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET: list all bills
export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('bills').select('*').order('due')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// POST: create a new bill
export async function POST(req: NextRequest) {
  const { name, amount, due, frequency } = await req.json()

  if (!name?.trim() || !amount || Number(amount) <= 0 || !due) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('bills')
    .insert({
      name: name.trim(),
      amount: Number(amount),
      due,
      paid: false,
      frequency,
    })
    .select()
    .single()


  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}