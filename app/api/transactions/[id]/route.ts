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

// PATCH: edit a transaction, OR soft-delete/restore (via { action: 'delete' | 'restore' })
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const transactionId = Number(id)
  const body = await req.json()
  const supabase = getSupabaseAdmin()

  // Handle soft-delete / restore
  if (body.action === 'delete' || body.action === 'restore') {
    const deleted = body.action === 'delete'
    const { data: item } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single()

    const { error } = await supabase
      .from('transactions')
      .update({ deleted })
      .eq('id', transactionId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (deleted && item) {
      await logHistory(transactionId, 'deleted', {
        merchant: { old: item.merchant, new: item.merchant },
        category: { old: item.category, new: item.category },
        amount: { old: item.amount, new: item.amount },
      })
    } else {
      await logHistory(transactionId, 'restored')
    }

    return NextResponse.json({ success: true })
  }

  // Otherwise: regular field edit
  const { data: previous, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (fetchError || !previous) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }

  const { merchant, category, amount, date, type } = body
  const updates = {
    merchant: merchant?.trim() ?? previous.merchant,
    category: category ?? previous.category,
    amount: amount !== undefined ? Number(amount) : previous.amount,
    date: date ?? previous.date,
    type: type ?? previous.type,
  }

  const { data: updated, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', transactionId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const changedFields: Record<string, { old: any; new: any }> = {}
  ;(['merchant', 'category', 'amount', 'date', 'type'] as const).forEach((key) => {
    if (previous[key] !== updated[key]) {
      changedFields[key] = { old: previous[key], new: updated[key] }
    }
  })

  await logHistory(transactionId, 'edited', Object.keys(changedFields).length ? changedFields : null)

  return NextResponse.json(updated)
}

// DELETE: permanently remove a transaction
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const transactionId = Number(id)
  const supabase = getSupabaseAdmin()

  const { error } = await supabase.from('transactions').delete().eq('id', transactionId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}