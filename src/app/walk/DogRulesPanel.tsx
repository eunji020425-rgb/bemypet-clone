'use client'

import { ThumbsUp, Flag, Info, ShieldCheck, Sparkles, AlertTriangle } from 'lucide-react'

interface TrailRules {
  id: string
  dogAllowed?: 'allowed' | 'leashed_only' | 'partial' | 'forbidden' | 'unknown'
  leashRequired?: boolean
  leashMaxLengthCm?: number
  pickupRequired?: boolean
  hazards?: string[]
  confidence?: number
  sourceType?: string
  userConfirms?: number
  userDisputes?: number
}

const HAZARD_LABEL: Record<string, string> = {
  tick: '진드기',
  snake: '뱀',
  wild_boar: '야생동물(멧돼지)',
  steep: '가파른 길',
  slippery_when_wet: '비온 후 미끄러움',
}

const DOG_ALLOWED_LABEL: Record<string, { label: string; color: string }> = {
  allowed:      { label: '동반 가능',          color: 'bg-green-100 text-green-700 border-green-200' },
  leashed_only: { label: '목줄 시 동반 가능',   color: 'bg-green-100 text-green-700 border-green-200' },
  partial:      { label: '일부 구역만 가능',    color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  forbidden:    { label: '동반 불가',          color: 'bg-red-100 text-red-700 border-red-200' },
  unknown:      { label: '확인 필요',          color: 'bg-gray-100 text-gray-600 border-gray-200' },
}

function ConfidenceBadge({ confidence, sourceType, disputes }: { confidence?: number; sourceType?: string; disputes?: number }) {
  const c = confidence ?? 0.5
  const tooManyDisputes = (disputes ?? 0) >= 3

  if (sourceType === 'official_api') {
    return (
      <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-bold">
        <ShieldCheck size={11} /> 공식 자료
      </span>
    )
  }
  if (tooManyDisputes || c < 0.4) {
    return (
      <span className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full font-bold">
        <Info size={11} /> 확인 필요
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
      <Sparkles size={11} /> AI 추정
    </span>
  )
}

export default function DogRulesPanel({
  trail,
  onFeedback,
}: {
  trail: TrailRules
  onFeedback: (type: 'confirm' | 'dispute') => void | Promise<void>
}) {
  const allowed = trail.dogAllowed && DOG_ALLOWED_LABEL[trail.dogAllowed]
  const hazards = (trail.hazards ?? []).filter(h => HAZARD_LABEL[h])

  return (
    <div className="mt-3 bg-white rounded-xl border border-[#d6e6ff] p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[#2a3a55]">🐶 반려견 동반 규정</span>
        <ConfidenceBadge
          confidence={trail.confidence}
          sourceType={trail.sourceType}
          disputes={trail.userDisputes}
        />
        {(trail.userConfirms ?? 0) >= 3 && (
          <span className="text-[10px] text-[#3a7ab8] font-bold">
            👥 {trail.userConfirms}명 확인
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {allowed && (
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${allowed.color}`}>
            {allowed.label}
          </span>
        )}
        {trail.leashRequired && (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold border bg-blue-100 text-blue-700 border-blue-200">
            🪢 목줄 필수{trail.leashMaxLengthCm ? ` (${(trail.leashMaxLengthCm / 100).toFixed(1)}m 이하)` : ''}
          </span>
        )}
        {trail.pickupRequired && (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold border bg-purple-100 text-purple-700 border-purple-200">
            💩 배변봉투 필수
          </span>
        )}
        {hazards.length > 0 && (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold border bg-orange-100 text-orange-700 border-orange-200 inline-flex items-center gap-1">
            <AlertTriangle size={10} /> {hazards.map(h => HAZARD_LABEL[h]).join(' · ')}
          </span>
        )}
      </div>

      {/* 피드백 */}
      <div className="flex items-center gap-2 pt-1 border-t border-[#f1f5f9]">
        <button
          onClick={() => onFeedback('confirm')}
          className="flex items-center gap-1 text-[11px] text-[#22c55e] hover:bg-green-50 px-2 py-1 rounded transition"
        >
          <ThumbsUp size={11} /> 맞아요
        </button>
        <button
          onClick={() => onFeedback('dispute')}
          className="flex items-center gap-1 text-[11px] text-[#ef4444] hover:bg-red-50 px-2 py-1 rounded transition"
        >
          <Flag size={11} /> 달라요
        </button>
        <span className="text-[10px] text-[#94a3b8] ml-auto">
          이 정보의 정확도를 알려주세요
        </span>
      </div>
    </div>
  )
}
