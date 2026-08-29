import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// PATCH: edit a budget (lookup by current name)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  const decodedName = decodeURIComponent(name)
  const { name: newName, limit, color } = await req.json()

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('budgets')
    .update({
      name: newName?.trim() ?? decodedName,
      limit: limit !== undefined ? Number(limit) : undefined,
      color,
    })
    .eq('name', decodedName)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// DELETE: remove a budget
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  const decodedName = decodeURIComponent(name)
  const supabase = getSupabaseAdmin()

  const { error } = await supabase.from('budgets').delete().eq('name', decodedName)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}