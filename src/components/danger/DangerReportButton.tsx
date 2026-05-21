'use client'

import { AlertTriangle } from 'lucide-react'

interface Props {
  onClick: () => void
  variant?: 'default' | 'floating' | 'compact'
  disabled?: boolean
}

/**
 * 위험 신고 트리거 버튼
 * - default: 산책 중 화면용 빨간 알약 버튼
 * - floating: 지도 우하단 큰 FAB (둥근 빨간)
 * - compact: 작은 인라인 버튼
 */
export default function DangerReportButton({ onClick, variant = 'default', disabled }: Props) {
  if (variant === 'floating') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label="위험 신고"
        title="위험 신고"
        className="bg-[#ef4444] hover:bg-[#dc2626] active:scale-95 disabled:opacity-60 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition"
      >
        <AlertTriangle size={24} strokeWidth={2.5} />
      </button>
    )
  }
  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className="bg-white hover:bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-full px-3 py-1.5 flex items-center gap-1 transition disabled:opacity-60"
      >
        <AlertTriangle size={12} />
        위험 신고
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-[#ef4444] hover:bg-[#dc2626] active:scale-95 disabled:opacity-60 text-white text-xs font-bold rounded-full px-4 py-2 flex items-center gap-1.5 shadow-md transition"
    >
      <AlertTriangle size={14} strokeWidth={2.5} />
      위험 신고
    </button>
  )
}
