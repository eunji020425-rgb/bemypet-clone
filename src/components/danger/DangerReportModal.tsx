'use client'

import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { createPortal } from 'react-dom'
import { DANGER_META, DANGER_CATEGORIES, type DangerCategory } from '@/lib/danger/types'

interface Props {
  open: boolean
  onClose: () => void
  /** 현재 GPS 좌표. 없으면 모달이 안내 메시지 표시 */
  coords: { lat: number; lng: number } | null
  /** 등록 성공 시 호출 (toast 등 부모에서 처리) */
  onSubmitted?: (result: { created_count: number; points_earned: number }) => void
}

export default function DangerReportModal({ open, onClose, coords, onSubmitted }: Props) {
  const [selected, setSelected] = useState<Set<DangerCategory>>(new Set())
  const [etcNote, setEtcNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  if (!open) return null
  if (typeof document === 'undefined') return null

  const toggle = (c: DangerCategory) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!coords) {
      setError('현재 위치를 확인할 수 없어요. 위치 권한을 허용해 주세요.')
      return
    }
    if (selected.size === 0) {
      setError('한 개 이상의 카테고리를 선택해주세요.')
      return
    }
    setError('')
    setLoading(true)

    const payload: { categories: DangerCategory[]; lat: number; lng: number; note?: string } = {
      categories: Array.from(selected),
      lat: coords.lat,
      lng: coords.lng,
    }
    if (selected.has('etc') && etcNote.trim().length > 0) {
      payload.note = etcNote.trim().slice(0, 200)
    }
    const res = await fetch('/api/danger-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null)

    setLoading(false)
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null
      if (res?.status === 401) {
        setError('로그인 후 신고할 수 있어요.')
      } else {
        setError(data?.error === 'invalid_input' ? '입력값이 올바르지 않아요.' : '신고 등록에 실패했어요. 잠시 후 다시 시도해 주세요.')
      }
      return
    }

    const data = (await res.json()) as { created_count: number; points_earned: number }
    setSelected(new Set())
    setEtcNote('')
    onSubmitted?.(data)
    onClose()
  }

  return createPortal(
    <>
      <div
        style={{ zIndex: 9998 }}
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        style={{ zIndex: 9999 }}
        className="fixed inset-x-0 bottom-0 mx-auto max-w-[480px] bg-white rounded-t-3xl shadow-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#2a3a55] flex items-center gap-2">
            <AlertTriangle size={18} className="text-[#ef4444]" />
            위험 신고
          </h2>
          <button onClick={onClose} className="p-1.5 text-[#94a3b8] hover:text-[#2a3a55]" aria-label="close">
            <X size={20} />
          </button>
        </div>

        <p className="text-xs text-[#6a7c95] mb-3">
          발견한 위험 요소를 모두 선택하세요. 현재 위치에 자동 등록됩니다.
        </p>

        <div className="flex flex-col gap-2 mb-4">
          {DANGER_CATEGORIES.map(code => {
            const meta = DANGER_META[code]
            const isSel = selected.has(code)
            return (
              <div key={code}>
                <button
                  onClick={() => toggle(code)}
                  disabled={loading}
                  className={`w-full flex items-center gap-3 rounded-2xl border-2 px-3 py-3 transition text-left ${
                    isSel
                      ? 'border-current bg-[#f0f6ff]'
                      : 'border-[#e6effc] hover:border-[#cbd5e1] bg-white'
                  }`}
                  style={{ color: isSel ? meta.color : '#94a3b8' }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: meta.color + '22' }}
                  >
                    <span>{meta.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#2a3a55]">{meta.label}</p>
                    {meta.description && (
                      <p className="text-[11px] text-[#6a7c95] truncate">{meta.description}</p>
                    )}
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                      isSel ? 'border-transparent' : 'border-[#cbd5e1] bg-white'
                    }`}
                    style={isSel ? { background: meta.color } : undefined}
                  >
                    {isSel && (
                      <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="4 11 8 15 16 6" />
                      </svg>
                    )}
                  </div>
                </button>

                {/* '기타' 체크 시 텍스트 입력 */}
                {code === 'etc' && isSel && (
                  <div className="mt-2 ml-2 mr-2">
                    <textarea
                      value={etcNote}
                      onChange={e => setEtcNote(e.target.value.slice(0, 200))}
                      placeholder="구체적으로 어떤 위험인지 적어주세요 (예: 깨진 유리, 죽은 동물, 자전거 도로 위 장애물 등)"
                      rows={2}
                      maxLength={200}
                      disabled={loading}
                      className="w-full border-2 border-[#e6effc] focus:border-[#8C949B] rounded-xl px-3 py-2 text-sm outline-none resize-none"
                    />
                    <p className="text-[10px] text-[#94a3b8] text-right mt-0.5">
                      {etcNote.length}/200
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || selected.size === 0 || !coords}
          className="w-full bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-60 text-white font-bold text-sm py-3 rounded-2xl transition"
        >
          {loading ? '등록 중...' : `올리기 ${selected.size > 0 ? `(${selected.size}개 · +${selected.size * 50}p)` : ''}`}
        </button>

        <p className="text-[10px] text-[#94a3b8] text-center mt-2">
          신고는 익명이며 카테고리별로 자동 만료됩니다.
        </p>
      </div>
    </>,
    document.body
  )
}
