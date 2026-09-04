import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { name, type } = await req.json()
  if (!name?.trim() || (type !== 'Expense' && type !== 'Income')) {
    return NextResponse.json({ error: 'Name and a valid type are required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const { data: previous, error: fetchError } = await supabase
    .from('categories')
    .select('name')
    .eq('id', id)
    .single()

  if (fetchError || !previous) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  const { data: updated, error } = await supabase
    .from('categories')
    .update({ name: name.trim(), type })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase
    .from('transactions')
    .update({ category: name.trim() })
    .eq('category', previous.name)

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getSupabaseAdmin()

  const { error } = await supabase.from('categories').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}