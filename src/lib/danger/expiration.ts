import type { DangerCategory } from './types'

/** 카테고리별 만료일 (KST 기준 계절 판단) */
export function daysToExpire(category: DangerCategory, at: Date = new Date()): number {
  const kstMonth = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', month: 'numeric' }).format(at),
    10
  )

  switch (category) {
    case 'construction':
      return 14
    case 'snake_pest':
      return kstMonth >= 6 && kstMonth <= 9 ? 14 : 7
    case 'rodenticide':
      return 7
    case 'castor_meal':
      return 30
    case 'etc':
      return 14
  }
}

/** 만료까지 남은 일수 (0 미만은 0 반환) */
export function daysRemaining(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

/** "N일 남음" 또는 "오늘 만료" 형식 */
export function formatTimeRemaining(expiresAt: string): string {
  const d = daysRemaining(expiresAt)
  if (d <= 0) return '오늘 만료'
  if (d === 1) return '내일 만료'
  return `${d}일 남음`
}
