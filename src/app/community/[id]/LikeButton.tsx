'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  postId: string
  initialCount: number
  initialLiked: boolean
  userId: string | null
}

export default function LikeButton({ postId, initialCount, initialLiked, userId }: Props) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const toggle = async () => {
    if (!userId) {
      router.push('/auth/login')
      return
    }
    if (loading) return
    setLoading(true)

    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)
      await supabase.from('posts').update({ likes_count: count - 1 }).eq('id', postId)
      setLiked(false)
      setCount(c => c - 1)
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: userId })
      await supabase.from('posts').update({ likes_count: count + 1 }).eq('id', postId)
      setLiked(true)
      setCount(c => c + 1)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-colors ${
        liked
          ? 'bg-red-50 text-red-500 border border-red-200'
          : 'bg-gray-50 text-[#888] border border-[#ececec] hover:border-red-200 hover:text-red-400'
      }`}
    >
      <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
      좋아요 {count}
    </button>
  )
}
