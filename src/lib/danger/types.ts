export const DANGER_CATEGORIES = [
  'construction',
  'snake_pest',
  'rodenticide',
  'castor_meal',
  'etc',
] as const

export type DangerCategory = (typeof DANGER_CATEGORIES)[number]

export interface DangerCategoryMeta {
  code: DangerCategory
  label: string
  emoji: string
  color: string
  radiusM: number | null
  description?: string
}

export const DANGER_META: Record<DangerCategory, DangerCategoryMeta> = {
  construction: {
    code: 'construction', label: '공사', emoji: '🚧',
    color: '#FF8A5C', radiusM: null,
    description: '도로/시설 공사 진행 중',
  },
  snake_pest: {
    code: 'snake_pest', label: '뱀·해충', emoji: '🐍',
    color: '#7B5DB8', radiusM: null,
    description: '뱀, 진드기, 말벌 등 위험 생물',
  },
  rodenticide: {
    code: 'rodenticide', label: '살서제', emoji: '☠️',
    color: '#C93030', radiusM: 50,
    description: '쥐약 살포 — 반려견 위험',
  },
  castor_meal: {
    code: 'castor_meal', label: '유박비료', emoji: '🌱',
    color: '#8B6B3D', radiusM: 30,
    description: '비료 살포 — 섭취 시 중독 위험',
  },
  etc: {
    code: 'etc', label: '기타', emoji: '⚪',
    color: '#8C949B', radiusM: null,
    description: '기타 주의사항',
  },
}

export interface DangerReport {
  id: string
  category: DangerCategory
  lat: number
  lng: number
  radius_m: number | null
  status: 'active' | 'expired' | 'removed'
  created_at: string
  expires_at: string
  note?: string | null
}
