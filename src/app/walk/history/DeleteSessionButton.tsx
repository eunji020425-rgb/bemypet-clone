'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  sessionId: string
  /** 'icon' = 작은 아이콘 / 'pill' = 텍스트 포함 알약 */
  variant?: 'icon' | 'pill'
  /** 삭제 후 동작 — 기본 router.refresh(), 'navigate' 주면 /walk/history 로 이동 */
  afterDelete?: 'refresh' | 'navigate'
}

export default function DeleteSessionButton({ sessionId, variant = 'icon', afterDelete = 'refresh' }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    if (loading) return
    if (!confirm('이 산책 기록을 삭제할까요? 되돌릴 수 없어요.')) return
    setLoading(true)
    const { error } = await supabase.from('walk_sessions').delete().eq('id', sessionId)
    setLoading(false)
    if (error) {
      alert('삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }
    if (afterDelete === 'navigate') {
      router.push('/walk/history')
      router.refresh()
    } else {
      router.refresh()
    }
  }

  if (variant === 'pill') {
    return (
      <button
        onClick={handleDelete}
        disabled={loading}
        className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full transition disabled:opacity-60"
      >
        <Trash2 size={12} />
        {loading ? '삭제 중...' : '기록 삭제'}
      </button>
    )
  }
  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      aria-label="기록 삭제"
      title="기록 삭제"
      className="p-2 text-[#cbd5e1] hover:text-red-500 hover:bg-red-50 rounded-full transition disabled:opacity-60"
    >
      <Trash2 size={14} />
    </button>
  )
}
