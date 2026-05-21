/**
 * 기상청 초단기실황 (getUltraSrtNcst)
 * - 매시 40분 이후에 해당 시각 base_time 사용 (api 발표 지연 고려)
 * - dataType=JSON
 */
import { z } from 'zod'
import type { Grid } from '../grid'

const NowItemSchema = z.object({
  category: z.string(),
  obsrValue: z.string(),
})
const NowResponseSchema = z.object({
  response: z.object({
    header: z.object({ resultCode: z.string(), resultMsg: z.string() }),
    body: z.object({
      items: z.object({
        item: z.array(NowItemSchema),
      }).optional(),
    }).optional(),
  }),
})

export interface NowResult {
  temp: number
  humidity: number
  windSpeed: number
  weatherCode: string  // PTY: 0없음 1비 2비/눈 3눈 5빗방울 6빗방울눈날림 7눈날림
}

/** KST 기준 초단기실황 base_date / base_time 계산 */
function getNcstBaseDateTime(now: Date = new Date()): { baseDate: string; baseTime: string } {
  // 매시 40분 이전이면 한 시간 전 자료 사용
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  if (kst.getMinutes() < 40) kst.setHours(kst.getHours() - 1)
  const yyyy = kst.getFullYear()
  const mm = String(kst.getMonth() + 1).padStart(2, '0')
  const dd = String(kst.getDate()).padStart(2, '0')
  const hh = String(kst.getHours()).padStart(2, '0')
  return { baseDate: `${yyyy}${mm}${dd}`, baseTime: `${hh}00` }
}

export async function fetchNow(grid: Grid, apiKey: string): Promise<NowResult | null> {
  const { baseDate, baseTime } = getNcstBaseDateTime()
  const url = new URL('https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst')
  url.searchParams.set('serviceKey', apiKey)
  url.searchParams.set('numOfRows', '10')
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
  const parsed = NowResponseSchema.safeParse(json)
  if (!parsed.success) return null
  const items = parsed.data.response.body?.items?.item ?? []
  if (items.length === 0) return null

  const map = new Map<string, string>()
  for (const it of items) map.set(it.category, it.obsrValue)

  const temp = parseFloat(map.get('T1H') ?? '0')
  const humidity = parseFloat(map.get('REH') ?? '0')
  const windSpeed = parseFloat(map.get('WSD') ?? '0')
  const weatherCode = map.get('PTY') ?? '0'

  return { temp, humidity, windSpeed, weatherCode }
}
