import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireAdmin()
  if (auth.error || !auth.supabase) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data: msg } = await auth.supabase
    .from('chat_messages')
    .select('hidden')
    .eq('id', id)
    .single()

  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await auth.supabase
    .from('chat_messages')
    .update({ hidden: !msg.hidden })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, hidden: !msg.hidden })
}
