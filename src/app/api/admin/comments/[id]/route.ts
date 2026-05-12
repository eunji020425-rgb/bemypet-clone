import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireAdmin()
  if (auth.error || !auth.supabase) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // 1) 댓글의 post_id 조회 (삭제 후 카운트 보정에 필요)
  const { data: comment } = await auth.supabase
    .from('comments')
    .select('post_id')
    .eq('id', id)
    .single()

  // 2) 댓글 삭제
  const { error } = await auth.supabase.from('comments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 3) 해당 게시글의 실제 댓글 개수 재계산 후 posts.comments_count 동기화
  if (comment?.post_id) {
    const { count } = await auth.supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', comment.post_id)

    await auth.supabase
      .from('posts')
      .update({ comments_count: count ?? 0 })
      .eq('id', comment.post_id)
  }

  return NextResponse.json({ ok: true })
}
