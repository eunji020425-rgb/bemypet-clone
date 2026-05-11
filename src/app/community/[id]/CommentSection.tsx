'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Comment } from '@/lib/supabase/types'
import { Send } from 'lucide-react'

type CommentWithProfile = Comment & { profiles: { nickname: string; avatar_url: string | null } }

interface Props {
  postId: string
  initialComments: CommentWithProfile[]
  userId: string | null
  userNickname: string | null
}

export default function CommentSection({ postId, initialComments, userId, userNickname }: Props) {
  const [comments, setComments] = useState<CommentWithProfile[]>(initialComments)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) {
      router.push('/auth/login')
      return
    }
    if (!text.trim()) return
    setLoading(true)

    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: userId, content: text.trim() })
      .select('*, profiles(nickname, avatar_url)')
      .single()

    if (!error && data) {
      setComments(prev => [...prev, data as CommentWithProfile])
      // 댓글 수 업데이트
      await supabase
        .from('posts')
        .update({ comments_count: comments.length + 1 })
        .eq('id', postId)
      setText('')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#ececec] p-6">
      <h2 className="text-sm font-bold text-[#2d2d2d] mb-4">댓글 {comments.length}개</h2>

      <div className="flex flex-col gap-4 mb-6">
        {comments.length === 0 && (
          <p className="text-xs text-[#bbb] text-center py-4">첫 번째 댓글을 남겨보세요!</p>
        )}
        {comments.map(c => (
          <div key={c.id} className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-[#f5e97a] flex items-center justify-center text-xs font-bold text-[#7a6a00] flex-shrink-0">
              {c.profiles?.nickname?.[0] ?? '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-[#2d2d2d]">{c.profiles?.nickname ?? '익명'}</span>
                <span className="text-xs text-[#bbb]">{new Date(c.created_at).toLocaleString('ko-KR')}</span>
              </div>
              <p className="text-sm text-[#444]">{c.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 댓글 입력 */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder={userId ? '댓글을 입력하세요...' : '로그인 후 댓글을 작성할 수 있습니다'}
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={!userId}
          className="flex-1 border border-[#ececec] rounded-full px-4 py-2 text-sm outline-none focus:border-[#f5c518] disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={loading || !userId || !text.trim()}
          className="bg-[#f5c518] hover:bg-[#e0b010] text-white rounded-full p-2 transition disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
