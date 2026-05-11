export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LikeButton from './LikeButton'
import CommentSection from './CommentSection'
import type { Post, Comment } from '@/lib/supabase/types'

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('posts')
    .select('*, profiles(nickname, avatar_url)')
    .eq('id', id)
    .single()

  if (!post) notFound()

  const { data: comments } = await supabase
    .from('comments')
    .select('*, profiles(nickname, avatar_url)')
    .eq('post_id', id)
    .order('created_at', { ascending: true })

  const { data: { user } } = await supabase.auth.getUser()

  const { data: likeData } = user
    ? await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', user.id)
        .single()
    : { data: null }

  const typedPost = post as Post & { profiles: { nickname: string; avatar_url: string | null } }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-[#ececec] p-6 mb-4">
        {/* 작성자 */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#f5e97a] flex items-center justify-center text-sm font-bold text-[#7a6a00]">
            {typedPost.profiles?.nickname?.[0] ?? '?'}
          </div>
          <div>
            <p className="text-sm font-medium text-[#2d2d2d]">{typedPost.profiles?.nickname ?? '익명'}</p>
            <p className="text-xs text-[#aaa]">{new Date(typedPost.created_at).toLocaleString('ko-KR')}</p>
          </div>
        </div>

        <h1 className="text-lg font-bold text-[#2d2d2d] mb-3">{typedPost.title}</h1>
        {typedPost.image_url && (
          <img src={typedPost.image_url} alt="" className="w-full rounded-xl mb-4 max-h-80 object-cover" />
        )}
        <p className="text-sm text-[#444] leading-relaxed whitespace-pre-wrap">{typedPost.content}</p>

        {/* 좋아요 버튼 */}
        <div className="mt-6 pt-4 border-t border-[#ececec]">
          <LikeButton
            postId={typedPost.id}
            initialCount={typedPost.likes_count ?? 0}
            initialLiked={!!likeData}
            userId={user?.id ?? null}
          />
        </div>
      </div>

      {/* 댓글 섹션 */}
      <CommentSection
        postId={typedPost.id}
        initialComments={(comments ?? []) as (Comment & { profiles: { nickname: string; avatar_url: string | null } })[]}
        userId={user?.id ?? null}
        userNickname={user?.user_metadata?.nickname ?? null}
      />
    </div>
  )
}
