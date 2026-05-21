/**
 * 생활기상지수 — 자외선 지수 (getUVIdxV4)
 * areaNo: 10자리 행정구역코드 (도/시도 수준)
 * 위경도 → 가장 가까운 시도 areaNo 매핑 (간단 거리 기반)
 */
import { z } from 'zod'
import type { UvGrade } from '../types'

const UvItemSchema = z.object({
  h0: z.string().optional(),
  h3: z.string().optional(),
  h6: z.string().optional(),
})
const UvResponseSchema = z.object({
  response: z.object({
    body: z.object({
      items: z.object({ item: z.array(UvItemSchema) }).optional(),
    }).optional(),
  }),
})

/** 시도/광역시 areaNo + 대표 좌표 (UV는 시도 단위로 발표) */
const SIDO_AREAS: Array<{ name: string; areaNo: string; lat: number; lng: number }> = [
  { name: '서울', areaNo: '1100000000', lat: 37.5665, lng: 126.978 },
  { name: '부산', areaNo: '2600000000', lat: 35.1796, lng: 129.0756 },
  { name: '대구', areaNo: '2700000000', lat: 35.8714, lng: 128.6014 },
  { name: '인천', areaNo: '2800000000', lat: 37.4563, lng: 126.7052 },
  { name: '광주', areaNo: '2900000000', lat: 35.1595, lng: 126.8526 },
  { name: '대전', areaNo: '3000000000', lat: 36.3504, lng: 127.3845 },
  { name: '울산', areaNo: '3100000000', lat: 35.5384, lng: 129.3114 },
  { name: '세종', areaNo: '3600000000', lat: 36.4801, lng: 127.289 },
  { name: '경기', areaNo: '4100000000', lat: 37.4138, lng: 127.5183 },
  { name: '강원', areaNo: '4200000000', lat: 37.8228, lng: 128.1555 },
  { name: '충북', areaNo: '4300000000', lat: 36.6357, lng: 127.4912 },
  { name: '충남', areaNo: '4400000000', lat: 36.5184, lng: 126.8 },
  { name: '전북', areaNo: '4500000000', lat: 35.7175, lng: 127.153 },
  { name: '전남', areaNo: '4600000000', lat: 34.8161, lng: 126.4629 },
  { name: '경북', areaNo: '4700000000', lat: 36.4919, lng: 128.8889 },
  { name: '경남', areaNo: '4800000000', lat: 35.2383, lng: 128.6921 },
  { name: '제주', areaNo: '5000000000', lat: 33.4996, lng: 126.5312 },
]

function nearestAreaNo(lat: number, lng: number): string {
  let best = SIDO_AREAS[0]
  let bestD = Infinity
  for (const a of SIDO_AREAS) {
    const d = (a.lat - lat) ** 2 + (a.lng - lng) ** 2
    if (d < bestD) {
      bestD = d
      best = a
    }
  }
  return best.areaNo
}

function gradeFromValue(v: number): UvGrade {
  if (v >= 11) return 'danger'
  if (v >= 8) return 'veryhigh'
  if (v >= 6) return 'high'
  if (v >= 3) return 'middle'
  return 'low'
}

function nowYmddH(): string {
  const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const yyyy = kst.getFullYear()
  const mm = String(kst.getMonth() + 1).padStart(2, '0')
  const dd = String(kst.getDate()).padStart(2, '0')
  // 3시간 단위 (00, 03, 06, ..., 21)
  const h3 = Math.floor(kst.getHours() / 3) * 3
  const hh = String(h3).padStart(2, '0')
  return `${yyyy}${mm}${dd}${hh}`
}

export interface UvResult {
  value: number
  grade: UvGrade
}

export async function fetchUv(lat: number, lng: number, apiKey: string): Promise<UvResult | null> {
  const areaNo = nearestAreaNo(lat, lng)
  const time = nowYmddH()

  const url = new URL('https://apis.data.go.kr/1360000/LivingWthrIdxServiceV4/getUVIdxV4')
  url.searchParams.set('serviceKey', apiKey)
  url.searchParams.set('numOfRows', '10')
  url.searchParams.set('pageNo', '1')
  url.searchParams.set('dataType', 'JSON')
  url.searchParams.set('areaNo', areaNo)
  url.searchParams.set('time', time)

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 1800 }, // UV는 3시간 단위라 30분 캐시
  })
  if (!res.ok) return null

  const json: unknown = await res.json()
  const parsed = UvResponseSchema.safeParse(json)
  if (!parsed.success) return null
  const item = parsed.data.response.body?.items?.item?.[0]
  if (!item) return null

  // 현재 시간 가장 가까운 값 사용 (h0=현재, h3=3시간 후 ...)
  const raw = item.h0 ?? item.h3 ?? '0'
  const value = parseInt(raw, 10) || 0
  return { value, grade: gradeFromValue(value) }
}
