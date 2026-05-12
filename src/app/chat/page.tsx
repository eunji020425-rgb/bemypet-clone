export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import ChatRoom from './ChatRoom'

export default async function ChatPage() {
  const supabase = await createClient()

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('*, profiles(nickname, avatar_url)')
    .eq('hidden', false)
    .order('created_at', { ascending: true })
    .limit(100)

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <h1 className="text-xl font-bold text-[#2d2d2d]">실시간 채팅</h1>
        <span className="text-xs text-[#aaa] ml-1">모두와 함께하는 라이브 채팅방 🐾</span>
      </div>
      <ChatRoom
        initialMessages={(messages ?? []) as any}
        userId={user?.id ?? null}
        userNickname={user?.user_metadata?.nickname ?? '익명'}
      />
    </div>
  )
}
