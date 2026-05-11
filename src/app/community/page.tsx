export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Heart, MessageCircle, PenSquare } from 'lucide-react'
import type { Post } from '@/lib/supabase/types'

export default async function CommunityPage() {
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('posts')
    .select('*, profiles(nickname, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(30)

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#2d2d2d]">자유게시판</h1>
        {user && (
          <Link
            href="/community/write"
            className="flex items-center gap-1 bg-[#f5c518] hover:bg-[#e0b010] text-white text-sm font-bold px-4 py-2 rounded-full transition-colors"
          >
            <PenSquare size={14} />
            글쓰기
          </Link>
        )}
      </div>

      {!posts || posts.length === 0 ? (
        <div className="text-center py-20 text-[#aaa]">
          <div className="text-5xl mb-4">🐾</div>
          <p className="text-sm">아직 게시글이 없습니다.</p>
          <p className="text-xs mt-1">첫 번째 글을 작성해보세요!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(posts as (Post & { profiles: { nickname: string; avatar_url: string | null } })[]).map(post => (
            <Link
              key={post.id}
              href={`/community/${post.id}`}
              className="bg-white rounded-2xl p-5 shadow-sm border border-[#ececec] hover:border-[#f5c518] transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h2 className="font-medium text-[#2d2d2d] text-sm line-clamp-2 flex-1">{post.title}</h2>
                {post.image_url && (
                  <img src={post.image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-[#888] line-clamp-2 mb-3">{post.content}</p>
              <div className="flex items-center justify-between text-xs text-[#aaa]">
                <span>{post.profiles?.nickname ?? '익명'}</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Heart size={12} /> {post.likes_count ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle size={12} /> {post.comments_count ?? 0}
                  </span>
                  <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
