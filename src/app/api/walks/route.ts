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

async function searchKakaoParks(lat: number, lng: number, query: string): Promise<RawPark[]> {
  const kakaoKey = process.env.KAKAO_REST_API_KEY?.trim()
  if (!kakaoKey) return []
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&x=${lng}&y=${lat}&radius=20000&sort=distance&size=15`
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
      distance: parseFloat(d.distance) / 1000,
      link: d.place_url,
    }))
  } catch {
    return []
  }
}

export async function POST(request: Request) {
  try {
    const { lat, lng } = await request.json()
    const queries = ['공원', '산책로', '둘레길']
    const allParks: RawPark[] = []
    const seen = new Set<string>()
    for (const q of queries) {
      const results = await searchKakaoParks(lat, lng, q)
      for (const p of results) {
        if (seen.has(p.id)) continue
        seen.add(p.id)
        allParks.push(p)
      }
    }
    allParks.sort((a, b) => a.distance - b.distance)
    return NextResponse.json({ parks: allParks.slice(0, 8) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 })
  }
}
