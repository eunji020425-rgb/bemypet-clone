import { NextResponse } from 'next/server'

interface Place {
  id: string
  name: string
  address: string
  phone?: string
  category: 'restaurant' | 'cafe' | 'playground'
  categoryLabel: string
  lat: number
  lng: number
  distance?: number
  link?: string
  rawCategory?: string
}

const CLOSED_KEYWORDS = ['폐업', '폐점', '휴업', '이전', '종료', '임시휴업', '리뉴얼중', '공사중']

const CATEGORY_QUERIES: Record<string, { label: string; queries: string[] }> = {
  restaurant: {
    label: '식당',
    queries: ['애견동반 식당', '반려동물 동반 식당', '강아지 동반 음식점', '애견동반 음식점', '애견동반 펜션 식당'],
  },
  cafe: {
    label: '카페',
    queries: ['애견카페', '애견동반 카페', '도그카페', '강아지 카페', '반려견 카페', '애견 펜션 카페', '애견 글램핑 카페'],
  },
  playground: {
    label: '운동장',
    queries: [
      '애견운동장', '반려견놀이터', '강아지 운동장', '도그파크', '독파크',
      '동물보호센터', '유기동물보호센터', '반려동물 놀이터',
      '애견펜션 운동장', '애견 글램핑',
    ],
  },
}

async function kakaoSearch(opts: {
  query: string
  lat?: number
  lng?: number
  rect?: string
  page?: number
}) {
  const kakaoKey = process.env.KAKAO_REST_API_KEY?.trim()
  if (!kakaoKey) return []

  let url: string
  if (opts.rect) {
    url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(opts.query)}&rect=${opts.rect}&size=15&page=${opts.page || 1}`
  } else if (opts.lat && opts.lng) {
    url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(opts.query)}&x=${opts.lng}&y=${opts.lat}&radius=20000&sort=distance&size=15&page=${opts.page || 1}`
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
    return data.documents || []
  } catch {
    return []
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const rect = searchParams.get('rect') || undefined

  if (!lat && !lng && !rect) {
    return NextResponse.json({ places: [], error: 'Missing location' }, { status: 200 })
  }

  const allPlaces: Place[] = []
  const seen = new Set<string>()

  // 카테고리별 병렬 검색
  await Promise.all(
    Object.entries(CATEGORY_QUERIES).map(async ([cat, info]) => {
      for (const q of info.queries) {
        const docs = await kakaoSearch({ query: q, lat, lng, rect })
        for (const d of docs) {
          if (seen.has(d.id)) continue
          seen.add(d.id)
          const name = d.place_name || ''
          // 폐업/이전 키워드 또는 카카오맵 URL 없는 경우 제외
          if (CLOSED_KEYWORDS.some(kw => name.includes(kw))) continue
          if (!d.place_url) continue
          const placeLat = parseFloat(d.y)
          const placeLng = parseFloat(d.x)
          if (!placeLat || !placeLng) continue
          allPlaces.push({
            id: `kakao-${d.id}`,
            name: d.place_name,
            address: d.road_address_name || d.address_name || '',
            phone: d.phone,
            category: cat as Place['category'],
            categoryLabel: info.label,
            lat: placeLat,
            lng: placeLng,
            distance: d.distance ? parseFloat(d.distance) / 1000 : undefined,
            link: d.place_url,
            rawCategory: d.category_name,
          })
        }
      }
    })
  )

  // 거리순 정렬
  if (lat && lng && !rect) {
    allPlaces.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
  }

  return NextResponse.json({ places: allPlaces })
}
