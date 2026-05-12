import { NextResponse } from 'next/server'

interface RawPark {
  id: string
  name: string
  address: string
  category: string
  lat: number
  lng: number
  distance: number
  link: string
}

async function searchKakaoParksOnePage(opts: {
  query: string
  lat?: number
  lng?: number
  rect?: string
  page: number
}): Promise<{ items: RawPark[]; isEnd: boolean }> {
  const kakaoKey = process.env.KAKAO_REST_API_KEY?.trim()
  if (!kakaoKey) return { items: [], isEnd: true }

  let url: string
  if (opts.rect) {
    url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(opts.query)}&rect=${opts.rect}&size=15&page=${opts.page}`
  } else if (opts.lat && opts.lng) {
    url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(opts.query)}&x=${opts.lng}&y=${opts.lat}&radius=20000&sort=distance&size=15&page=${opts.page}`
  } else {
    return { items: [], isEnd: true }
  }

  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${kakaoKey}` },
      next: { revalidate: 300 },
    })
    if (!res.ok) return { items: [], isEnd: true }
    const data = await res.json()
    const items: RawPark[] = (data.documents || []).map((d: any) => ({
      id: d.id,
      name: d.place_name,
      address: d.road_address_name || d.address_name || '',
      category: d.category_name || '',
      lat: parseFloat(d.y),
      lng: parseFloat(d.x),
      distance: d.distance ? parseFloat(d.distance) / 1000 : 0,
      link: d.place_url,
    }))
    return { items, isEnd: data.meta?.is_end ?? true }
  } catch {
    return { items: [], isEnd: true }
  }
}

async function searchKakaoParksAllPages(opts: {
  query: string
  lat?: number
  lng?: number
  rect?: string
}): Promise<RawPark[]> {
  const all: RawPark[] = []
  // 카카오는 최대 3페이지(45개)까지 조회
  for (let page = 1; page <= 3; page++) {
    const { items, isEnd } = await searchKakaoParksOnePage({ ...opts, page })
    all.push(...items)
    if (isEnd || items.length < 15) break
  }
  return all
}

export async function POST(request: Request) {
  try {
    const { lat, lng, rect } = await request.json()
    const queries = ['공원', '산책로', '둘레길']
    const allParks: RawPark[] = []
    const seen = new Set<string>()

    // 키워드별 병렬 호출
    const results = await Promise.all(
      queries.map(q => searchKakaoParksAllPages({ query: q, lat, lng, rect }))
    )

    for (const list of results) {
      for (const p of list) {
        if (seen.has(p.id)) continue
        seen.add(p.id)
        allParks.push(p)
      }
    }

    // 거리 정보 있으면 거리순, 없으면 그대로
    if (lat && lng && !rect) {
      allParks.sort((a, b) => a.distance - b.distance)
    }

    // 위치 기반(소규모): 12개로 제한, 영역 기반(전국): 100개까지
    const limit = rect ? 100 : 12
    return NextResponse.json({ parks: allParks.slice(0, limit) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error', parks: [] }, { status: 200 })
  }
}
