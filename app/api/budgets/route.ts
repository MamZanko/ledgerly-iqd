import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET: list all budgets
export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('budgets').select('*').order('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// POST: create a new budget
export async function POST(req: NextRequest) {
  const { name, limit, color } = await req.json()

  if (!name?.trim() || !limit || Number(limit) <= 0) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('budgets')
    .insert({ name: name.trim(), spent: 0, limit: Number(limit), color })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}