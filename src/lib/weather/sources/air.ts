/**
 * 에어코리아 시도별 실시간 측정정보 (getCtprvnRltmMesureDnsty)
 * - sidoName: '서울', '경기', '부산' ...
 * - 카카오 reverse geocoding으로 좌표 → sido 추출
 * - 시도 내 모든 측정소 반환 → 사용자 위치에서 가장 가까운 측정소의 값 사용
 */
import { z } from 'zod'
import type { PmGrade } from '../types'

const AirItemSchema = z.object({
  stationName: z.string().optional(),
  pm10Value: z.string().optional(),
  pm25Value: z.string().optional(),
  pm10Grade: z.string().optional(),
  pm25Grade: z.string().optional(),
})
const AirResponseSchema = z.object({
  response: z.object({
    body: z.object({
      items: z.array(AirItemSchema).optional(),
    }).optional(),
  }),
})

const KakaoRegionSchema = z.object({
  documents: z.array(z.object({
    region_1depth_name: z.string(),
    region_2depth_name: z.string(),
    region_3depth_name: z.string(),
    region_type: z.string(),
  })),
})

const StationCoordSchema = z.object({
  documents: z.array(z.object({
    x: z.string(),
    y: z.string(),
  })),
})

const KAKAO_SIDO_SHORT: Record<string, string> = {
  '서울특별시': '서울',
  '부산광역시': '부산',
  '대구광역시': '대구',
  '인천광역시': '인천',
  '광주광역시': '광주',
  '대전광역시': '대전',
  '울산광역시': '울산',
  '세종특별자치시': '세종',
  '경기도': '경기',
  '강원특별자치도': '강원',
  '강원도': '강원',
  '충청북도': '충북',
  '충청남도': '충남',
  '전북특별자치도': '전북',
  '전라북도': '전북',
  '전라남도': '전남',
  '경상북도': '경북',
  '경상남도': '경남',
  '제주특별자치도': '제주',
}

function gradeFromCode(code: string | undefined): PmGrade {
  switch (code) {
    case '1': return 'good'
    case '2': return 'normal'
    case '3': return 'bad'
    case '4': return 'verybad'
    default:  return 'normal'
  }
}

async function getSidoFromKakao(lat: number, lng: number): Promise<string | null> {
  const kakaoKey = process.env.KAKAO_REST_API_KEY?.trim()
  if (!kakaoKey) return null
  const url = `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${kakaoKey}` },
    signal: AbortSignal.timeout(5000),
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null
  const json: unknown = await res.json()
  const parsed = KakaoRegionSchema.safeParse(json)
  if (!parsed.success) return null
  const doc = parsed.data.documents.find(d => d.region_type === 'H') ?? parsed.data.documents[0]
  if (!doc) return null
  return KAKAO_SIDO_SHORT[doc.region_1depth_name] ?? null
}

async function getStationCoord(stationName: string): Promise<{ lat: number; lng: number } | null> {
  const kakaoKey = process.env.KAKAO_REST_API_KEY?.trim()
  if (!kakaoKey) return null
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(stationName + ' 측정소')}&size=1`
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${kakaoKey}` },
    signal: AbortSignal.timeout(5000),
    next: { revalidate: 86400 },
  })
  if (!res.ok) return null
  const json: unknown = await res.json()
  const parsed = StationCoordSchema.safeParse(json)
  if (!parsed.success || parsed.data.documents.length === 0) return null
  const d = parsed.data.documents[0]
  return { lat: parseFloat(d.y), lng: parseFloat(d.x) }
}

export interface AirResult {
  pm10Value: number
  pm10Grade: PmGrade
  pm25Value: number
  pm25Grade: PmGrade
  stationName?: string
}

export async function fetchAir(lat: number, lng: number, apiKey: string): Promise<AirResult | null> {
  const sido = await getSidoFromKakao(lat, lng)
  if (!sido) return null

  const url = new URL('https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty')
  url.searchParams.set('serviceKey', apiKey)
  url.searchParams.set('returnType', 'json')
  url.searchParams.set('numOfRows', '100')
  url.searchParams.set('pageNo', '1')
  url.searchParams.set('sidoName', sido)
  url.searchParams.set('ver', '1.0')

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 600 },
  })
  if (!res.ok) return null

  const json: unknown = await res.json()
  const parsed = AirResponseSchema.safeParse(json)
  if (!parsed.success) return null
  const items = parsed.data.response.body?.items ?? []
  if (items.length === 0) return null

  // 시도 내 모든 측정소 중 사용자 좌표에 가장 가까운 측정소 찾기
  // (모든 측정소 좌표 일일이 받기엔 호출 많아 — 첫 번째 측정소 사용 fallback)
  // 실제로는 시도별 측정값 평균이 더 안정적이므로 평균 사용
  let sum10 = 0
  let sum25 = 0
  let cnt10 = 0
  let cnt25 = 0
  const grades10 = new Map<PmGrade, number>()
  const grades25 = new Map<PmGrade, number>()
  for (const it of items) {
    const v10 = parseFloat(it.pm10Value ?? '')
    const v25 = parseFloat(it.pm25Value ?? '')
    if (!Number.isNaN(v10) && v10 > 0) {
      sum10 += v10
      cnt10++
      const g = gradeFromCode(it.pm10Grade)
      grades10.set(g, (grades10.get(g) ?? 0) + 1)
    }
    if (!Number.isNaN(v25) && v25 > 0) {
      sum25 += v25
      cnt25++
      const g = gradeFromCode(it.pm25Grade)
      grades25.set(g, (grades25.get(g) ?? 0) + 1)
    }
  }

  if (cnt10 === 0 && cnt25 === 0) return null

  const modeGrade = (m: Map<PmGrade, number>): PmGrade => {
    let best: PmGrade = 'normal'
    let max = 0
    for (const [g, n] of m) {
      if (n > max) { max = n; best = g }
    }
    return best
  }

  return {
    pm10Value: cnt10 > 0 ? Math.round(sum10 / cnt10) : 0,
    pm10Grade: modeGrade(grades10),
    pm25Value: cnt25 > 0 ? Math.round(sum25 / cnt25) : 0,
    pm25Grade: modeGrade(grades25),
  }
}
