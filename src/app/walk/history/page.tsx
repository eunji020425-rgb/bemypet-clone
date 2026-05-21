export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Footprints, ArrowLeft } from 'lucide-react'
import HistoryListClient from './HistoryListClient'

interface Session {
  id: string
  trail_id: string
  trail_name: string | null
  trail_lat: number | null
  trail_lng: number | null
  started_at: string
  ended_at: string | null
  duration_s: number | null
  distance_m: number | null
  path: [number, number][] | null
}

function formatDistance(m: number | null | undefined): string {
  if (!m || m < 0) return '-'
  if (m < 1000) return `${Math.round(m)}m`
  return `${(m / 1000).toFixed(2)}km`
}

function formatDuration(s: number | null): string {
  if (!s || s < 0) return '-'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}시간 ${m}분`
  if (m > 0) return `${m}분 ${sec}초`
  return `${sec}초`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default async function WalkHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Footprints className="mx-auto text-[#3a7ab8] mb-4" size={48} />
        <h1 className="text-xl font-bold text-[#2a3a55] mb-2">내 산책 이력</h1>
        <p className="text-sm text-[#6a7c95] mb-6">로그인하면 산책 기록을 볼 수 있어요.</p>
        <Link
          href="/auth/login"
          className="inline-block bg-[#3a7ab8] hover:bg-[#1a2a3f] text-white text-sm font-bold px-6 py-2 rounded-full transition-colors"
        >
          로그인
        </Link>
      </div>
    )
  }

  const { data: sessions } = await supabase
    .from('walk_sessions')
    .select('*')
    .eq('user_id', user.id)
    .not('ended_at', 'is', null)   // 종료된 산책만 노출 (진행중 미표시)
    .order('started_at', { ascending: false })
    .limit(50)

  const list: Session[] = (sessions as Session[]) ?? []

  // 통계 계산
  const now = Date.now()
  const today0 = new Date()
  today0.setHours(0, 0, 0, 0)
  const week0 = new Date(now - 7 * 24 * 60 * 60 * 1000)

  const finished = list.filter(s => s.ended_at && s.duration_s)
  const totalCount = finished.length
  const totalSec = finished.reduce((sum, s) => sum + (s.duration_s ?? 0), 0)
  const totalDist = finished.reduce((sum, s) => sum + (s.distance_m ?? 0), 0)
  const todayCount = finished.filter(s => new Date(s.started_at) >= today0).length
  const weekCount = finished.filter(s => new Date(s.started_at) >= week0).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Footprints className="text-[#3a7ab8]" size={22} />
        <h1 className="text-xl font-bold text-[#2a3a55]">내 산책 이력</h1>
        <Link href="/walk" className="ml-auto text-xs text-[#6a7c95] hover:text-[#3a7ab8]">
          ← 산책로 보기
        </Link>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white border border-[#d6e6ff] rounded-2xl p-4">
          <p className="text-xs text-[#6a7c95]">오늘</p>
          <p className="text-2xl font-bold text-[#2a3a55] mt-1">{todayCount}<span className="text-sm font-normal text-[#6a7c95]">회</span></p>
        </div>
        <div className="bg-white border border-[#d6e6ff] rounded-2xl p-4">
          <p className="text-xs text-[#6a7c95]">이번 주</p>
          <p className="text-2xl font-bold text-[#2a3a55] mt-1">{weekCount}<span className="text-sm font-normal text-[#6a7c95]">회</span></p>
        </div>
        <div className="bg-white border border-[#d6e6ff] rounded-2xl p-4">
          <p className="text-xs text-[#6a7c95]">총 산책</p>
          <p className="text-2xl font-bold text-[#3a7ab8] mt-1">{totalCount}<span className="text-sm font-normal text-[#6a7c95]">회</span></p>
        </div>
        <div className="bg-white border border-[#d6e6ff] rounded-2xl p-4">
          <p className="text-xs text-[#6a7c95]">총 시간</p>
          <p className="text-2xl font-bold text-[#3a7ab8] mt-1">
            {Math.floor(totalSec / 3600)}<span className="text-sm font-normal text-[#6a7c95]">시간 </span>
            {Math.floor((totalSec % 3600) / 60)}<span className="text-sm font-normal text-[#6a7c95]">분</span>
          </p>
        </div>
        <div className="bg-white border border-[#d6e6ff] rounded-2xl p-4 col-span-2 md:col-span-1">
          <p className="text-xs text-[#6a7c95]">총 거리</p>
          <p className="text-2xl font-bold text-[#22c55e] mt-1">
            {totalDist < 1000
              ? <>{Math.round(totalDist)}<span className="text-sm font-normal text-[#6a7c95]">m</span></>
              : <>{(totalDist / 1000).toFixed(2)}<span className="text-sm font-normal text-[#6a7c95]">km</span></>
            }
          </p>
        </div>
      </div>

      {/* 이력 리스트 */}
      <HistoryListClient sessions={list} />
    </div>
  )
}
