'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Footprints, Clock, TrendingUp, Trash2, CheckSquare, Square, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

interface Props {
  sessions: Session[]
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

function formatDistance(m: number | null | undefined): string {
  if (!m || m < 0) return '-'
  if (m < 1000) return `${Math.round(m)}m`
  return `${(m / 1000).toFixed(2)}km`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function HistoryListClient({ sessions }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  if (sessions.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-[#d6e6ff] rounded-2xl">
        <Footprints className="mx-auto text-[#d6e6ff] mb-3" size={40} />
        <p className="text-sm text-[#6a7c95]">아직 산책 기록이 없어요</p>
        <Link href="/walk" className="inline-block mt-3 text-xs text-[#3a7ab8] font-bold hover:underline">
          지금 산책 시작하기 →
        </Link>
      </div>
    )
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(sessions.map(s => s.id)))
  const clearSelection = () => setSelected(new Set())

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelected(new Set())
  }

  const deleteIds = async (ids: string[]) => {
    if (ids.length === 0) return
    setBusy(true)
    const { error } = await supabase.from('walk_sessions').delete().in('id', ids)
    setBusy(false)
    if (error) {
      alert('삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }
    exitSelectMode()
    router.refresh()
  }

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return
    if (!confirm(`선택한 ${selected.size}개 산책 기록을 삭제할까요? 되돌릴 수 없어요.`)) return
    await deleteIds(Array.from(selected))
  }

  const handleDeleteAll = async () => {
    if (!confirm(`내 산책 기록 ${sessions.length}개 전부를 삭제할까요? 되돌릴 수 없어요.`)) return
    await deleteIds(sessions.map(s => s.id))
  }

  return (
    <>
      {/* 상단 액션 바 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {!selectMode ? (
          <>
            <button
              onClick={() => setSelectMode(true)}
              disabled={busy}
              className="flex items-center gap-1.5 bg-white border border-[#d6e6ff] hover:border-[#3a7ab8] text-[#3a7ab8] text-xs font-bold px-3 py-1.5 rounded-full transition"
            >
              <CheckSquare size={13} /> 선택 삭제
            </button>
            <button
              onClick={handleDeleteAll}
              disabled={busy}
              className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full transition disabled:opacity-60 ml-auto"
            >
              <Trash2 size={13} /> 전체 삭제
            </button>
          </>
        ) : (
          <>
            <button
              onClick={selected.size === sessions.length ? clearSelection : selectAll}
              className="flex items-center gap-1.5 bg-white border border-[#d6e6ff] hover:border-[#3a7ab8] text-[#3a7ab8] text-xs font-bold px-3 py-1.5 rounded-full transition"
            >
              {selected.size === sessions.length
                ? <><Square size={13} /> 전체 해제</>
                : <><CheckSquare size={13} /> 전체 선택</>}
            </button>
            <span className="text-xs text-[#6a7c95]">
              {selected.size}/{sessions.length}개
            </span>
            <button
              onClick={handleDeleteSelected}
              disabled={selected.size === 0 || busy}
              className="ml-auto flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-1.5 rounded-full transition"
            >
              <Trash2 size={13} /> 삭제 ({selected.size})
            </button>
            <button
              onClick={exitSelectMode}
              disabled={busy}
              className="flex items-center gap-1 text-[#6a7c95] hover:text-[#2a3a55] text-xs px-2 py-1.5"
            >
              <X size={13} /> 취소
            </button>
          </>
        )}
      </div>

      {/* 리스트 */}
      <div className="flex flex-col gap-2">
        {sessions.map(s => {
          const isSel = selected.has(s.id)
          const Wrapper = selectMode
            ? ({ children }: { children: React.ReactNode }) => (
                <button
                  onClick={() => toggleSelect(s.id)}
                  className="w-full text-left"
                >
                  {children}
                </button>
              )
            : ({ children }: { children: React.ReactNode }) => (
                <Link href={`/walk/history/${s.id}`} className="block">
                  {children}
                </Link>
              )
          return (
            <Wrapper key={s.id}>
              <div
                className={`bg-white rounded-xl p-4 border transition-all ${
                  selectMode
                    ? isSel
                      ? 'border-[#3a7ab8] bg-[#f0f6ff] shadow-sm'
                      : 'border-[#d6e6ff] hover:border-[#3a7ab8]'
                    : 'border-[#d6e6ff] hover:border-[#3a7ab8] hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-3">
                  {selectMode && (
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                        isSel ? 'border-transparent bg-[#3a7ab8]' : 'border-[#cbd5e1] bg-white'
                      }`}
                    >
                      {isSel && (
                        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="4 11 8 15 16 6" />
                        </svg>
                      )}
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[#d6e6ff]">
                    <Footprints size={16} className="text-[#3a7ab8]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#2a3a55] truncate">
                      {s.trail_name ?? '산책'}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[#6a7c95] flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {formatDate(s.started_at)}
                      </span>
                      <span className="flex items-center gap-1 text-[#3a7ab8] font-bold">
                        <TrendingUp size={11} /> {formatDuration(s.duration_s)}
                      </span>
                      {s.distance_m != null && s.distance_m > 0 && (
                        <span className="flex items-center gap-1 text-[#22c55e] font-bold">
                          📏 {formatDistance(s.distance_m)}
                        </span>
                      )}
                      {Array.isArray(s.path) && s.path.length >= 2 && (
                        <span className="text-[#6a7c95]">🗺 경로 {s.path.length}점</span>
                      )}
                      {!selectMode && <span className="text-[#3a7ab8] ml-auto">자세히 →</span>}
                    </div>
                  </div>
                </div>
              </div>
            </Wrapper>
          )
        })}
      </div>
    </>
  )
}
