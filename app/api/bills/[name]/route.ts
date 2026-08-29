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

// PATCH: toggle paid status (or edit other fields)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  const decodedName = decodeURIComponent(name)
  const body = await req.json()

  const supabase = getSupabaseAdmin()

  if (typeof body.paid === 'boolean' && Object.keys(body).length === 1) {
    // Fetch the bill first so we know its details
    const { data: bill, error: fetchError } = await supabase
      .from('bills')
      .select('*')
      .eq('name', decodedName)
      .single()

    if (fetchError || !bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('bills')
      .update({ paid: body.paid })
      .eq('name', decodedName)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If marking as paid (not un-marking), create a matching transaction
    if (body.paid === true) {
      const today = new Date().toISOString().slice(0, 10)
      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .insert({
          merchant: bill.name,
          category: 'Utilities',
          amount: bill.amount,
          date: today,
          type: 'Expense',
        })
        .select()
        .single()

      if (!txError && tx) {
        await logHistory(tx.id, 'created', {
          merchant: { old: '', new: tx.merchant },
          category: { old: '', new: tx.category },
          amount: { old: 0, new: tx.amount },
          date: { old: '', new: tx.date },
          type: { old: '', new: tx.type },
        })
      }
    }

    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from('bills')
    .update(body)
    .eq('name', decodedName)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// DELETE: remove a bill
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  const decodedName = decodeURIComponent(name)
  const supabase = getSupabaseAdmin()

  const { error } = await supabase.from('bills').delete().eq('name', decodedName)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}