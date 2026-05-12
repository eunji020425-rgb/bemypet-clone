import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST() {
  const auth = await requireAdmin()
  if (auth.error || !auth.supabase) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  let totalDeleted = 0

  for (const table of ['place_rules', 'walk_rules', 'hospital_rules']) {
    const { count } = await auth.supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .lt('updated_at', cutoff)

    if (count) {
      await auth.supabase.from(table).delete().lt('updated_at', cutoff)
      totalDeleted += count
    }
  }

  return NextResponse.json({ ok: true, deleted: totalDeleted })
}
