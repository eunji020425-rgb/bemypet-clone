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

async function searchKakaoParks(opts: {
  query: string
  lat?: number
  lng?: number
  rect?: string
}): Promise<RawPark[]> {
  const kakaoKey = process.env.KAKAO_REST_API_KEY?.trim()
  if (!kakaoKey) return []

  let url: string
  if (opts.rect) {
    url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(opts.query)}&rect=${opts.rect}&size=15`
  } else if (opts.lat && opts.lng) {
    url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(opts.query)}&x=${opts.lng}&y=${opts.lat}&radius=20000&sort=distance&size=15`
  } else {
    return []
  }

  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${kakaoKey}` },
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.documents || []).map((d: any) => ({
      id: d.id,
      name: d.place_name,
      address: d.road_address_name || d.address_name || '',
      category: d.category_name || '',
      lat: parseFloat(d.y),
      lng: parseFloat(d.x),
      distance: d.distance ? parseFloat(d.distance) / 1000 : 0,
      link: d.place_url,
    }))
  } catch {
    return []
  }
}

export async function POST(request: Request) {
  try {
    const { lat, lng, rect } = await request.json()
    const queries = ['공원', '산책로', '둘레길']
    const allParks: RawPark[] = []
    const seen = new Set<string>()
    for (const q of queries) {
      const results = await searchKakaoParks({ query: q, lat, lng, rect })
      for (const p of results) {
        if (seen.has(p.id)) continue
        seen.add(p.id)
        allParks.push(p)
      }
    }
    // 거리 정보가 있으면 거리순, 없으면 그대로
    if (lat && lng && !rect) {
      allParks.sort((a, b) => a.distance - b.distance)
    }
    return NextResponse.json({ parks: allParks.slice(0, 12) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error', parks: [] }, { status: 200 })
  }
}
