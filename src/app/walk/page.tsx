export const dynamic = 'force-dynamic'
import WalkPage from './WalkPage'
import RecentWalks from './RecentWalks'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Footprints } from 'lucide-react'

export default async function WalkRoutePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let recent: any[] = []
  if (user) {
    const { data } = await supabase
      .from('walk_sessions')
      .select('id, trail_name, trail_lat, trail_lng, started_at, ended_at, duration_s, distance_m')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(5)
    recent = data ?? []
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Footprints className="text-[#3a7ab8]" size={22} />
        <h1 className="text-xl font-bold text-[#2a3a55]">산책로 추천</h1>
        <span className="text-xs text-[#aaa] ml-1 hidden sm:inline">AI가 추천하는 근처 반려동물 산책로</span>
      </div>

      <WalkPage />

      {/* 하단: 내가 다녀온 산책 */}
      <RecentWalks isLoggedIn={!!user} sessions={recent} />
    </div>
  )
}
