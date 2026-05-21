export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Footprints, Clock, MapPin, TrendingUp } from 'lucide-react'

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
      {list.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#d6e6ff] rounded-2xl">
          <Footprints className="mx-auto text-[#d6e6ff] mb-3" size={40} />
          <p className="text-sm text-[#6a7c95]">아직 산책 기록이 없어요</p>
          <Link href="/walk" className="inline-block mt-3 text-xs text-[#3a7ab8] font-bold hover:underline">
            지금 산책 시작하기 →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map(s => {
            const isActive = !s.ended_at
            return (
              <div
                key={s.id}
                className={`bg-white rounded-xl p-4 border ${isActive ? 'border-[#22c55e] bg-[#f0fdf4]' : 'border-[#d6e6ff]'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-[#22c55e]' : 'bg-[#d6e6ff]'}`}>
                    <Footprints size={16} className={isActive ? 'text-white' : 'text-[#3a7ab8]'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[#2a3a55] truncate flex-1">
                        {s.trail_name ?? '산책로'}
                      </p>
                      {isActive && (
                        <span className="flex items-center gap-1 text-xs bg-[#22c55e] text-white px-2 py-0.5 rounded-full font-bold">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          진행중
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[#6a7c95] flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {formatDate(s.started_at)}
                      </span>
                      {!isActive && (
                        <span className="flex items-center gap-1 text-[#3a7ab8] font-bold">
                          <TrendingUp size={11} /> {formatDuration(s.duration_s)}
                        </span>
                      )}
                      {!isActive && s.distance_m != null && s.distance_m > 0 && (
                        <span className="flex items-center gap-1 text-[#22c55e] font-bold">
                          📏 {formatDistance(s.distance_m)}
                        </span>
                      )}
                      {s.trail_lat && s.trail_lng && (
                        <Link
                          href={`/route?from=walk&name=${encodeURIComponent(s.trail_name ?? '')}&lat=${s.trail_lat}&lng=${s.trail_lng}`}
                          className="flex items-center gap-1 text-[#3a7ab8] hover:underline"
                        >
                          <MapPin size={11} /> 길찾기
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
