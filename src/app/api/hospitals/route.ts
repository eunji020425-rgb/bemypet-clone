import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query') || '동물병원'
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const radius = searchParams.get('radius') || '20000'
  const rect = searchParams.get('rect') // "minLng,minLat,maxLng,maxLat"
  const page = searchParams.get('page') || '1'

  const kakaoKey = process.env.KAKAO_REST_API_KEY?.trim()

  if (!kakaoKey) {
    return NextResponse.json({ items: [], error: 'Kakao API key not configured' }, { status: 200 })
  }

  // rect 또는 lat/lng + radius 둘 다 지원
  let url: string
  if (rect) {
    url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&rect=${rect}&size=15&page=${page}`
  } else if (lat && lng) {
    url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&x=${lng}&y=${lat}&radius=${radius}&sort=distance&size=15&page=${page}`
  } else {
    return NextResponse.json({ items: [], error: 'Missing location params' }, { status: 200 })
  }

  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${kakaoKey}` },
      next: { revalidate: 300 },
    })
    if (!res.ok) {
      const errBody = await res.text()
      console.error('[hospitals] kakao error:', errBody)
      return NextResponse.json({ items: [], error: 'Kakao API error' }, { status: 200 })
    }
    const data = await res.json()
    const items = (data.documents || []).map((d: any) => ({
      id: `kakao-${d.id}`,
      name: d.place_name,
      address: d.road_address_name || d.address_name,
      phone: d.phone,
      lat: parseFloat(d.y),
      lng: parseFloat(d.x),
      distance: d.distance ? parseFloat(d.distance) / 1000 : undefined,
      category: d.category_name,
      link: d.place_url,
      source: 'kakao',
    }))
    return NextResponse.json({ items, isEnd: data.meta?.is_end })
  } catch (e: any) {
    console.error('[hospitals] error:', e)
    return NextResponse.json({ items: [], error: e.message }, { status: 200 })
  }
}
