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
    // 30분 이상 미종료 상태인 내 세션은 자동으로 닫기 (브라우저 닫고 가서 방치된 것들)
    const STALE_MIN = 30
    const cutoff = new Date(Date.now() - STALE_MIN * 60 * 1000).toISOString()
    const { data: stale } = await supabase
      .from('walk_sessions')
      .select('id, started_at')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .lt('started_at', cutoff)

    if (stale && stale.length > 0) {
      // 한 번에 모두 종료 처리 (duration_s = 종료시각 - 시작시각, 최대 30분으로 캡)
      const updates = stale.map(s => {
        const startedMs = new Date(s.started_at).getTime()
        const dur = Math.min(Math.floor((Date.now() - startedMs) / 1000), STALE_MIN * 60)
        return supabase
          .from('walk_sessions')
          .update({ ended_at: new Date().toISOString(), duration_s: dur })
          .eq('id', s.id)
      })
      await Promise.all(updates)
    }

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
