export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Footprints, Clock, MapPin, TrendingUp, ArrowLeft, Calendar, Navigation } from 'lucide-react'
import WalkDetailMap from './WalkDetailMap'
import DeleteSessionButton from '../DeleteSessionButton'

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

function formatDuration(s: number | null): string {
  if (!s || s < 0) return '-'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}시간 ${m}분 ${sec}초`
  if (m > 0) return `${m}분 ${sec}초`
  return `${sec}초`
}

function formatDistance(m: number | null): string {
  if (!m || m < 0) return '0m'
  if (m < 1000) return `${Math.round(m)}m`
  return `${(m / 1000).toFixed(2)}km`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function calcPace(distanceM: number | null, durationS: number | null): string {
  if (!distanceM || !durationS || distanceM < 10) return '-'
  // 1km당 소요 시간 (분/km)
  const minPerKm = (durationS / 60) / (distanceM / 1000)
  const mm = Math.floor(minPerKm)
  const ss = Math.round((minPerKm - mm) * 60)
  return `${mm}'${String(ss).padStart(2, '0')}"/km`
}

export default async function WalkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: session, error } = await supabase
    .from('walk_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !session) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-[#6a7c95] mb-4">산책 기록을 찾을 수 없어요.</p>
        <Link href="/walk/history" className="inline-block text-xs text-[#3a7ab8] font-bold hover:underline">
          ← 이력으로
        </Link>
      </div>
    )
  }

  const s = session as Session
  const path = Array.isArray(s.path) ? s.path : []
  const isActive = !s.ended_at

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/walk/history" className="text-[#6a7c95] hover:text-[#3a7ab8] flex items-center gap-1 text-sm">
          <ArrowLeft size={16} />
          이력
        </Link>
        <h1 className="text-xl font-bold text-[#2a3a55] ml-2 truncate">
          {s.trail_name ?? '산책'}
        </h1>
        {isActive && (
          <span className="flex items-center gap-1 text-xs bg-[#22c55e] text-white px-2 py-0.5 rounded-full font-bold">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            진행중
          </span>
        )}
        <div className="ml-auto">
          <DeleteSessionButton sessionId={s.id} variant="pill" afterDelete="navigate" />
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="bg-white rounded-2xl p-5 border border-[#d6e6ff] mb-4">
        <div className="flex items-center gap-2 text-sm text-[#6a7c95] mb-3">
          <Calendar size={14} />
          <span>{formatDateTime(s.started_at)}</span>
          {s.ended_at && (
            <>
              <span className="text-[#aaa]">→</span>
              <span>{formatDateTime(s.ended_at)}</span>
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-[#6a7c95]">거리</p>
            <p className="text-xl font-bold text-[#22c55e]">{formatDistance(s.distance_m)}</p>
          </div>
          <div>
            <p className="text-xs text-[#6a7c95]">시간</p>
            <p className="text-xl font-bold text-[#3a7ab8]">{formatDuration(s.duration_s)}</p>
          </div>
          <div>
            <p className="text-xs text-[#6a7c95]">페이스</p>
            <p className="text-xl font-bold text-[#2a3a55]">{calcPace(s.distance_m, s.duration_s)}</p>
          </div>
        </div>
      </div>

      {/* 지도 */}
      <WalkDetailMap
        path={path}
        trailLat={s.trail_lat}
        trailLng={s.trail_lng}
        trailName={s.trail_name}
      />

      {/* 액션 */}
      {s.trail_lat && s.trail_lng && (
        <div className="mt-4 flex gap-2">
          <Link
            href={`/route?from=walk&name=${encodeURIComponent(s.trail_name ?? '')}&lat=${s.trail_lat}&lng=${s.trail_lng}`}
            className="bg-[#3a7ab8] hover:bg-[#1a2a3f] text-white font-bold text-sm px-4 py-2 rounded-full flex items-center gap-1.5 transition"
          >
            <Navigation size={13} /> 이 산책로로 길찾기
          </Link>
          <Link
            href="/walk"
            className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-sm px-4 py-2 rounded-full flex items-center gap-1.5 transition"
          >
            <Footprints size={13} /> 다시 산책하기
          </Link>
        </div>
      )}

      {path.length === 0 && !isActive && (
        <p className="text-xs text-[#aaa] mt-3 text-center">
          이 산책에는 경로 데이터가 없어요 (GPS가 꺼져있었거나 정확도가 부족했을 수 있어요)
        </p>
      )}
    </div>
  )
}
