/**
 * 4개 source 응답 + 사용자 좌표 → WeatherSummary
 * 추천 우선순위 8단계 로직
 */
import type {
  WeatherSummary, WeatherKind, RecommendLevel, PartialSourceData, UvGrade,
} from './types'

/** 체감온도 계산 (Steadman 간이식 — 한국 기상청 사용 공식 유사) */
function calcFeelsLike(temp: number, humidity: number, windSpeed: number): number {
  // 여름 (≥27°C, 습도≥40%) → 열지수
  if (temp >= 27 && humidity >= 40) {
    const T = temp
    const RH = humidity
    return Math.round(
      -8.78469475556 +
      1.61139411 * T +
      2.33854883889 * RH -
      0.14611605 * T * RH -
      0.012308094 * T * T -
      0.0164248277778 * RH * RH +
      0.002211732 * T * T * RH +
      0.00072546 * T * RH * RH -
      0.000003582 * T * T * RH * RH
    )
  }
  // 겨울 (≤10°C, 풍속≥4.8km/h)
  const windKmh = windSpeed * 3.6
  if (temp <= 10 && windKmh >= 4.8) {
    return Math.round(
      13.12 + 0.6215 * temp - 11.37 * Math.pow(windKmh, 0.16) + 0.3965 * temp * Math.pow(windKmh, 0.16)
    )
  }
  return Math.round(temp)
}

function weatherKindFromCodes(ptyCode: string, sky: string): WeatherKind {
  // PTY: 0없음 1비 2비/눈 3눈 5빗방울 6빗방울눈날림 7눈날림
  if (ptyCode === '3' || ptyCode === '7') return 'snowy'
  if (ptyCode === '1' || ptyCode === '2' || ptyCode === '5' || ptyCode === '6') return 'rainy'
  // SKY: 1맑음 3구름많음 4흐림
  if (sky === '4') return 'cloudy'
  if (sky === '3') return 'cloudy'
  return 'sunny'
}

interface RecResult {
  level: RecommendLevel
  message: string
  reason?: string
}

/** 추천 로직 8단계 우선순위 */
function recommend(args: {
  pm25Value: number
  pm25Grade: string
  pm10Grade: string
  feelsLike: number
  todayMaxTemp: number
  uvValue: number
  uvGrade: UvGrade
  precipitation: number
}): RecResult {
  const { pm25Value, pm25Grade, pm10Grade, feelsLike, todayMaxTemp, uvValue, uvGrade, precipitation } = args

  // 1. PM2.5 매우나쁨 (76 이상)
  if (pm25Value >= 76 || pm25Grade === 'verybad') {
    return { level: 'avoid', message: '오늘은 실내가 안전해요', reason: 'pm25_verybad' }
  }
  // 2. 폭염 (체감 33°C 이상)
  if (feelsLike >= 33) {
    return { level: 'avoid', message: '한낮 산책 피해주세요', reason: 'heatwave' }
  }
  // 3. 한파 (체감 -5°C 이하)
  if (feelsLike <= -5) {
    return { level: 'caution', message: '짧은 코스 + 옷 챙기세요', reason: 'cold_snap' }
  }
  // 4. 자외선 매우높음 (8 이상)
  if (uvValue >= 8 || uvGrade === 'veryhigh' || uvGrade === 'danger') {
    return { level: 'caution', message: '그늘 많은 코스 추천', reason: 'uv_high' }
  }
  // 5. 강수확률 70% 이상
  if (precipitation >= 70) {
    return { level: 'caution', message: '가까운 산책로만', reason: 'rain_high' }
  }
  // 6. 한낮 30°C 이상
  if (todayMaxTemp >= 30) {
    return { level: 'caution', message: '그늘 코스 추천', reason: 'hot' }
  }
  // 7. PM10 또는 PM2.5 나쁨
  if (pm25Grade === 'bad' || pm10Grade === 'bad') {
    return { level: 'caution', message: '산책 시간 짧게', reason: 'pm_bad' }
  }
  // 8. 정상
  return { level: 'good', message: '산책 좋은 날', reason: 'normal' }
}

export function summarize(
  lat: number,
  lng: number,
  data: PartialSourceData,
): WeatherSummary {
  const temp = data.now?.temp ?? data.forecast?.todayMaxTemp ?? 0
  const humidity = data.now?.humidity ?? 50
  const wind = data.now?.windSpeed ?? 0
  const feelsLike = calcFeelsLike(temp, humidity, wind)

  const ptyCode = data.now?.weatherCode ?? data.forecast?.weatherCode ?? '0'
  const sky = data.forecast?.sky ?? '1'
  const weather = weatherKindFromCodes(ptyCode, sky)

  const pm10Value = data.air?.pm10Value ?? 0
  const pm25Value = data.air?.pm25Value ?? 0
  const pm10Grade = data.air?.pm10Grade ?? 'normal'
  const pm25Grade = data.air?.pm25Grade ?? 'normal'

  const uvValue = data.uv?.value ?? 0
  const uvGrade = data.uv?.grade ?? 'low'

  const precipitation = data.forecast?.precipitation ?? 0
  const todayMaxTemp = data.forecast?.todayMaxTemp ?? temp

  const rec = recommend({
    pm25Value, pm25Grade, pm10Grade,
    feelsLike, todayMaxTemp,
    uvValue, uvGrade,
    precipitation,
  })

  return {
    location: { lat, lng },
    current: { temp: Math.round(temp), feelsLike, precipitation, weather },
    air: {
      pm10: { value: pm10Value, grade: pm10Grade },
      pm25: { value: pm25Value, grade: pm25Grade },
    },
    uv: { value: uvValue, grade: uvGrade },
    recommendation: {
      canWalk: rec.level !== 'avoid',
      level: rec.level,
      message: rec.message,
      reason: rec.reason,
    },
    fetchedAt: new Date().toISOString(),
  }
}

/** 4개 API 모두 실패 시 fallback summary */
export function emptySummary(lat: number, lng: number): WeatherSummary {
  return {
    location: { lat, lng },
    current: { temp: 0, feelsLike: 0, precipitation: 0, weather: 'cloudy' },
    air: {
      pm10: { value: 0, grade: 'normal' },
      pm25: { value: 0, grade: 'normal' },
    },
    uv: { value: 0, grade: 'low' },
    recommendation: {
      canWalk: true,
      level: 'good',
      message: '날씨 정보를 불러오지 못했어요',
      reason: 'all_failed',
    },
    fetchedAt: new Date().toISOString(),
  }
}
