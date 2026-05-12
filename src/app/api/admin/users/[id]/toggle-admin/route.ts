import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireAdmin()
  if (auth.error || !auth.supabase || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // 본인은 자기 권한 변경 불가
  if (id === auth.user.id) {
    return NextResponse.json({ error: '본인 권한은 변경할 수 없습니다.' }, { status: 400 })
  }

  // 현재 상태 조회
  const { data: target } = await auth.supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', id)
    .single()

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { error } = await auth.supabase
    .from('profiles')
    .update({ is_admin: !target.is_admin })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, is_admin: !target.is_admin })
}
