import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

const TABLE_MAP: Record<string, string> = {
  place: 'place_rules',
  walk: 'walk_rules',
  hospital: 'hospital_rules',
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth.error || !auth.supabase) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { type } = await request.json()
  const table = TABLE_MAP[type]
  if (!table) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  // 모든 행 조회 후 삭제 카운트
  const { count: beforeCount } = await auth.supabase
    .from(table)
    .select('*', { count: 'exact', head: true })

  const { error } = await auth.supabase
    .from(table)
    .delete()
    .gte('updated_at', '1970-01-01')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, deleted: beforeCount ?? 0 })
}
