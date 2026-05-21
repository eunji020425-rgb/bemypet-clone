/**
 * 기상청 단기예보 (getVilageFcst)
 * - 발표시각: 02, 05, 08, 11, 14, 17, 20, 23시 (10분 지연)
 * - 오늘 최고/최저 기온 + 강수확률 + 하늘상태 추출
 */
import { z } from 'zod'
import type { Grid } from '../grid'

const FcstItemSchema = z.object({
  category: z.string(),
  fcstDate: z.string(),
  fcstTime: z.string(),
  fcstValue: z.string(),
})
const FcstResponseSchema = z.object({
  response: z.object({
    body: z.object({
      items: z.object({
        item: z.array(FcstItemSchema),
      }).optional(),
    }).optional(),
  }),
})

export interface ForecastResult {
  todayMaxTemp: number
  todayMinTemp: number
  precipitation: number
  sky: string
  weatherCode: string
}

const FCST_HOURS = [2, 5, 8, 11, 14, 17, 20, 23]

function getFcstBaseDateTime(now: Date = new Date()): { baseDate: string; baseTime: string } {
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  // 10분 지연 고려
  if (kst.getMinutes() < 10) kst.setHours(kst.getHours() - 1)
  let hour = kst.getHours()
  // FCST_HOURS 중 hour 이하인 가장 큰 값
  let baseHour = FCST_HOURS[0]
  let crossedMidnight = false
  for (const h of FCST_HOURS) {
    if (h <= hour) baseHour = h
  }
  if (hour < FCST_HOURS[0]) {
    // 자정~02시 사이 → 전날 23시 발표 사용
    baseHour = 23
    crossedMidnight = true
  }
  if (crossedMidnight) kst.setDate(kst.getDate() - 1)
  const yyyy = kst.getFullYear()
  const mm = String(kst.getMonth() + 1).padStart(2, '0')
  const dd = String(kst.getDate()).padStart(2, '0')
  return { baseDate: `${yyyy}${mm}${dd}`, baseTime: `${String(baseHour).padStart(2, '0')}00` }
}

function todayDateStr(): string {
  const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  return `${kst.getFullYear()}${String(kst.getMonth() + 1).padStart(2, '0')}${String(kst.getDate()).padStart(2, '0')}`
}

export async function fetchForecast(grid: Grid, apiKey: string): Promise<ForecastResult | null> {
  const { baseDate, baseTime } = getFcstBaseDateTime()
  const url = new URL('https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst')
  url.searchParams.set('serviceKey', apiKey)
  url.searchParams.set('numOfRows', '300')
  url.searchParams.set('pageNo', '1')
  url.searchParams.set('dataType', 'JSON')
  url.searchParams.set('base_date', baseDate)
  url.searchParams.set('base_time', baseTime)
  url.searchParams.set('nx', String(grid.nx))
  url.searchParams.set('ny', String(grid.ny))

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 600 },
  })
  if (!res.ok) return null

  const json: unknown = await res.json()
  const parsed = FcstResponseSchema.safeParse(json)
  if (!parsed.success) return null
  const items = parsed.data.response.body?.items?.item ?? []
  if (items.length === 0) return null

  const today = todayDateStr()
  let max = -999
  let min = 999
  let pop = 0
  let sky = '1'
  let pty = '0'

  for (const it of items) {
    if (it.fcstDate !== today) continue
    const value = it.fcstValue
    switch (it.category) {
      case 'TMX': {
        const v = parseFloat(value)
        if (!Number.isNaN(v) && v > max) max = v
        break
      }
      case 'TMN': {
        const v = parseFloat(value)
        if (!Number.isNaN(v) && v < min) min = v
        break
      }
      case 'POP': {
        const v = parseFloat(value)
        if (!Number.isNaN(v) && v > pop) pop = v
        break
      }
      case 'SKY': {
        sky = value
        break
      }
      case 'PTY': {
        if (value !== '0') pty = value
        break
      }
    }
  }

  if (max === -999 || min === 999) {
    // TMX/TMN 없으면 TMP 시간별 값으로 추정
    for (const it of items) {
      if (it.fcstDate === today && it.category === 'TMP') {
        const v = parseFloat(it.fcstValue)
        if (!Number.isNaN(v)) {
          if (v > max || max === -999) max = v
          if (v < min || min === 999) min = v
        }
      }
    }
  }

  return {
    todayMaxTemp: max === -999 ? 0 : max,
    todayMinTemp: min === 999 ? 0 : min,
    precipitation: pop,
    sky,
    weatherCode: pty,
  }
}
