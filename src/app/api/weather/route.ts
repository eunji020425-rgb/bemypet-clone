import { NextResponse } from 'next/server'
import { z } from 'zod'
import { latLngToGrid } from '@/lib/weather/grid'
import { fetchNow } from '@/lib/weather/sources/now'
import { fetchForecast } from '@/lib/weather/sources/forecast'
import { fetchUv } from '@/lib/weather/sources/uv'
import { fetchAir } from '@/lib/weather/sources/air'
import { summarize, emptySummary } from '@/lib/weather/summarize'
import type { PartialSourceData } from '@/lib/weather/types'

export const runtime = 'nodejs'
export const revalidate = 600

const QuerySchema = z.object({
  lat: z.coerce.number().min(33).max(39),
  lng: z.coerce.number().min(124).max(132),
})

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = QuerySchema.safeParse({
    lat: url.searchParams.get('lat'),
    lng: url.searchParams.get('lng'),
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 400 })
  }

  const { lat, lng } = parsed.data
  const apiKey = process.env.PUBLIC_DATA_API_KEY?.trim()

  // 키 없으면 즉시 fallback (graceful)
  if (!apiKey) {
    const empty = emptySummary(lat, lng)
    empty.recommendation.message = '날씨 정보를 불러오지 못했어요'
    empty.recommendation.reason = 'no_api_key'
    return NextResponse.json(empty)
  }

  const grid = latLngToGrid(lat, lng)

  const [nowR, fcstR, uvR, airR] = await Promise.allSettled([
    fetchNow(grid, apiKey),
    fetchForecast(grid, apiKey),
    fetchUv(lat, lng, apiKey),
    fetchAir(lat, lng, apiKey),
  ])

  const data: PartialSourceData = {}
  if (nowR.status === 'fulfilled' && nowR.value) data.now = nowR.value
  if (fcstR.status === 'fulfilled' && fcstR.value) data.forecast = fcstR.value
  if (uvR.status === 'fulfilled' && uvR.value) data.uv = uvR.value
  if (airR.status === 'fulfilled' && airR.value) data.air = airR.value

  // 4개 모두 실패 시 — fallback (HTTP 200)
  if (!data.now && !data.forecast && !data.uv && !data.air) {
    const empty = emptySummary(lat, lng)
    empty.recommendation.message = '날씨 정보를 불러오지 못했어요'
    empty.recommendation.reason = 'all_apis_failed'
    return NextResponse.json(empty)
  }

  const summary = summarize(lat, lng, data)
  return NextResponse.json(summary)
}
