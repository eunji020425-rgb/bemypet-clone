'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Send } from 'lucide-react'
import type { ChatMessage } from '@/lib/supabase/types'

type MiniProfile = { nickname: string; avatar_url: string | null }
type MessageWithProfile = Omit<ChatMessage, 'profiles'> & { profiles: MiniProfile }

interface Props {
  initialMessages: MessageWithProfile[]
  userId: string | null
  userNickname: string
}

export default function ChatRoom({ initialMessages, userId, userNickname }: Props) {
  const [messages, setMessages] = useState<MessageWithProfile[]>(initialMessages)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // 새 메시지 도착 시 스크롤 하단으로
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Supabase Realtime 구독
  useEffect(() => {
    const channel = supabase
      .channel('chat_messages_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          // 숨김 처리된 새 메시지는 표시 안 함
          if ((payload.new as any).hidden) return
          // 새 메시지의 프로필 조회
          const { data: profile } = await supabase
            .from('profiles')
            .select('nickname, avatar_url')
            .eq('id', payload.new.user_id)
            .single()

          const newMsg: MessageWithProfile = {
            ...(payload.new as ChatMessage),
            profiles: profile
              ? { nickname: profile.nickname, avatar_url: profile.avatar_url }
              : { nickname: '익명', avatar_url: null },
          }
          setMessages(prev => [...prev, newMsg])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          // 관리자가 숨김 처리 → 화면에서 즉시 제거
          if ((payload.new as any).hidden) {
            setMessages(prev => prev.filter(m => m.id !== (payload.new as any).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) {
      router.push('/auth/login')
      return
    }
    if (!text.trim() || loading) return
    setLoading(true)

    await supabase.from('chat_messages').insert({
      user_id: userId,
      content: text.trim(),
    })

    setText('')
    setLoading(false)
  }

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#e8e3d0] flex flex-col" style={{ height: '70vh' }}>
      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-center text-[#bbb] text-sm py-10">
            <div className="text-4xl mb-2">💬</div>
            <p>채팅을 시작해보세요!</p>
          </div>
        )}
        {messages.map((msg, idx) => {
          const isMe = msg.user_id === userId
          const showAvatar = idx === 0 || messages[idx - 1].user_id !== msg.user_id

          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* 아바타 (내 메시지는 숨김) */}
              {!isMe && (
                <div className={`w-7 h-7 rounded-full bg-[#d4e8b0] flex items-center justify-center text-xs font-bold text-[#5a7a3a] flex-shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                  {msg.profiles?.nickname?.[0] ?? '?'}
                </div>
              )}

              <div className={`flex flex-col gap-0.5 max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                {showAvatar && !isMe && (
                  <span className="text-xs text-[#aaa] px-1">{msg.profiles?.nickname ?? '익명'}</span>
                )}
                <div className={`flex items-end gap-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-[#5a7a3a] text-white rounded-tr-sm'
                        : 'bg-[#f5f5f5] text-[#2d3a22] rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-[#ccc] flex-shrink-0">{formatTime(msg.created_at)}</span>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="border-t border-[#e8e3d0] px-4 py-3">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            placeholder={userId ? '메시지를 입력하세요...' : '로그인 후 채팅에 참여하세요'}
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={!userId}
            className="flex-1 border border-[#e8e3d0] rounded-full px-4 py-2 text-sm outline-none focus:border-[#5a7a3a] disabled:bg-gray-50"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={loading || !userId || !text.trim()}
            className="bg-[#5a7a3a] hover:bg-[#1a2310] text-white rounded-full p-2.5 transition disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </form>
        {!userId && (
          <p className="text-xs text-center text-[#aaa] mt-2">
            <a href="/auth/login" className="text-[#5a7a3a] hover:underline">로그인</a>하고 채팅에 참여하세요
          </p>
        )}
      </div>
    </div>
  )
}
