export type WeatherKind = 'sunny' | 'cloudy' | 'rainy' | 'snowy'
export type PmGrade = 'good' | 'normal' | 'bad' | 'verybad'
export type UvGrade = 'low' | 'middle' | 'high' | 'veryhigh' | 'danger'
export type RecommendLevel = 'good' | 'caution' | 'avoid'

export interface WeatherSummary {
  location: {
    lat: number
    lng: number
    addressDong?: string
    sidoName?: string
    sigunguName?: string
  }
  current: {
    temp: number
    feelsLike: number
    precipitation: number // %
    weather: WeatherKind
  }
  air: {
    pm10: { value: number; grade: PmGrade }
    pm25: { value: number; grade: PmGrade }
  }
  uv: {
    value: number
    grade: UvGrade
  }
  recommendation: {
    canWalk: boolean
    level: RecommendLevel
    message: string
    reason?: string
  }
  fetchedAt: string
}

/** 부분 응답 — 일부 source 실패 시 채워지지 않는 필드는 undefined */
export interface PartialSourceData {
  now?: {
    temp: number
    humidity: number
    windSpeed: number
    weatherCode: string  // PTY 코드 (강수형태)
  }
  forecast?: {
    todayMaxTemp: number
    todayMinTemp: number
    precipitation: number
    sky: string  // 1=맑음 3=구름많음 4=흐림
    weatherCode: string
  }
  uv?: {
    value: number
    grade: UvGrade
  }
  air?: {
    pm10Value: number
    pm10Grade: PmGrade
    pm25Value: number
    pm25Grade: PmGrade
  }
}

export const PM_LABEL: Record<PmGrade, string> = {
  good: '좋음',
  normal: '보통',
  bad: '나쁨',
  verybad: '매우나쁨',
}

export const UV_LABEL: Record<UvGrade, string> = {
  low: '낮음',
  middle: '보통',
  high: '높음',
  veryhigh: '매우높음',
  danger: '위험',
}

export const WEATHER_LABEL: Record<WeatherKind, string> = {
  sunny: '맑음',
  cloudy: '흐림',
  rainy: '비',
  snowy: '눈',
}
