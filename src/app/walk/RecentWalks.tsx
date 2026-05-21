import Link from 'next/link'
import { Footprints, Clock, TrendingUp } from 'lucide-react'
import DeleteSessionButton from './history/DeleteSessionButton'

interface Session {
  id: string
  trail_name: string | null
  trail_lat: number | null
  trail_lng: number | null
  started_at: string
  ended_at: string | null
  duration_s: number | null
  distance_m: number | null
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

function formatDistance(m: number | null): string {
  if (!m || m < 0) return '-'
  if (m < 1000) return `${Math.round(m)}m`
  return `${(m / 1000).toFixed(2)}km`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (isToday) return `오늘 ${hm}`
  if (isYesterday) return `어제 ${hm}`
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`
}

export default function RecentWalks({ isLoggedIn, sessions }: { isLoggedIn: boolean; sessions: Session[] }) {
  if (!isLoggedIn) {
    return (
      <section className="mt-10 pt-8 border-t border-[#d6e6ff]">
        <h2 className="text-lg font-bold text-[#2a3a55] mb-3 flex items-center gap-2">
          <TrendingUp size={18} className="text-[#3a7ab8]" />
          내가 다녀온 곳
        </h2>
        <div className="bg-white rounded-2xl p-6 border border-[#d6e6ff] text-center">
          <p className="text-sm text-[#6a7c95] mb-3">로그인하면 산책 기록을 모아볼 수 있어요</p>
          <Link
            href="/auth/login"
            className="inline-block bg-[#3a7ab8] hover:bg-[#1a2a3f] text-white text-xs font-bold px-5 py-2 rounded-full transition"
          >
            로그인
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-10 pt-8 border-t border-[#d6e6ff]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-[#2a3a55] flex items-center gap-2">
          <TrendingUp size={18} className="text-[#3a7ab8]" />
          내가 다녀온 곳
        </h2>
        {sessions.length > 0 && (
          <Link href="/walk/history" className="text-xs text-[#3a7ab8] hover:underline font-semibold">
            전체보기 →
          </Link>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 border border-[#d6e6ff] text-center">
          <Footprints className="mx-auto text-[#d6e6ff] mb-2" size={32} />
          <p className="text-sm text-[#6a7c95]">아직 산책 기록이 없어요</p>
          <p className="text-xs text-[#aaa] mt-1">산책로를 골라서 시작해보세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sessions.map(s => (
            <div key={s.id} className="relative">
              <div className="absolute top-1 right-1 z-10">
                <DeleteSessionButton sessionId={s.id} />
              </div>
              <Link
                href={`/walk/history/${s.id}`}
                className="block bg-white rounded-xl p-4 border border-[#d6e6ff] hover:border-[#3a7ab8] hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-[#d6e6ff]">
                    <Footprints size={14} className="text-[#3a7ab8]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#2a3a55] truncate">
                      {s.trail_name ?? '산책'}
                    </p>
                    <p className="text-xs text-[#6a7c95] flex items-center gap-1 mt-0.5">
                      <Clock size={10} /> {formatDate(s.started_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[#22c55e] font-bold">📏 {formatDistance(s.distance_m)}</span>
                  <span className="text-[#3a7ab8] font-bold">⏱ {formatDuration(s.duration_s)}</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
