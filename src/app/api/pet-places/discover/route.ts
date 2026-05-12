import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const MODEL_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-flash-latest',
]

async function getRegionName(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko&zoom=8`,
      { headers: { 'User-Agent': 'PetTogether/1.0' } }
    )
    const data = await res.json()
    const a = data.address || {}
    const parts = [a.state, a.city || a.county || a.town].filter(Boolean)
    return parts.join(' ') || a.state || a.city || ''
  } catch {
    return ''
  }
}

async function kakaoLookup(query: string, lat: number, lng: number) {
  const kakaoKey = process.env.KAKAO_REST_API_KEY?.trim()
  if (!kakaoKey) return null
  try {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&x=${lng}&y=${lat}&radius=20000&size=5&sort=distance`
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${kakaoKey}` },
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const doc = data.documents?.[0]
    if (!doc) return null
    return {
      id: doc.id,
      name: doc.place_name,
      address: doc.road_address_name || doc.address_name || '',
      phone: doc.phone,
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
      distance: doc.distance ? parseFloat(doc.distance) / 1000 : undefined,
      link: doc.place_url,
      rawCategory: doc.category_name,
    }
  } catch {
    return null
  }
}

async function getGeminiPetPlaces(region: string): Promise<{ name: string; category: 'restaurant' | 'cafe' | 'playground' }[]> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey || !region) return []

  const genAI = new GoogleGenerativeAI(apiKey)

  const prompt = `한국 ${region} 지역의 유명한 애견 동반 장소 이름을 25개 알려주세요.
SNS·블로그·여행자들이 자주 추천하는 곳들로, 다음 카테고리에 골고루 분포되게:
- 애견 동반 식당
- 애견 카페 (도그카페, 야외 운동장 있는 카페 포함)
- 애견 운동장 (도그파크, 펜션, 글램핑 부설 운동장 포함)

JSON 배열만 반환하세요. 실제로 존재할 가능성이 높은 장소만 포함하세요:
[
  { "name": "정확한 가게 이름 (브랜드명 또는 정식 상호)", "category": "restaurant" | "cafe" | "playground" }
]

장소명은 가능한 한 정확하게 (지역명 포함 가능). 25개 채우지 못해도 됩니다.`

  for (const modelName of MODEL_CHAIN) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
      })
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const parsed = JSON.parse(text)
      const arr = Array.isArray(parsed) ? parsed : parsed.places || []
      return arr
        .filter((x: any) => x?.name && ['restaurant', 'cafe', 'playground'].includes(x.category))
        .map((x: any) => ({ name: x.name, category: x.category }))
    } catch (e: any) {
      console.log(`[discover] ${modelName} failed: ${e?.message?.slice(0, 200)}`)
      continue
    }
  }
  return []
}

export async function POST(request: Request) {
  try {
    const { lat, lng, existingIds = [] } = await request.json()
    if (!lat || !lng) {
      return NextResponse.json({ places: [] })
    }

    const region = await getRegionName(lat, lng)
    if (!region) {
      return NextResponse.json({ places: [], message: 'Region not found' })
    }

    const suggestions = await getGeminiPetPlaces(region)
    if (suggestions.length === 0) {
      return NextResponse.json({ places: [], region })
    }

    // 카카오로 각 장소 검증 (병렬)
    const CATEGORY_LABELS: Record<string, string> = {
      restaurant: '식당',
      cafe: '카페',
      playground: '운동장',
    }

    const existing = new Set(existingIds)
    const seenName = new Set<string>()
    const lookups = await Promise.all(
      suggestions.map(async s => {
        const doc = await kakaoLookup(s.name, lat, lng)
        if (!doc) return null
        const id = `kakao-${doc.id}`
        if (existing.has(id)) return null
        const key = doc.name.replace(/\s+/g, '').toLowerCase()
        if (seenName.has(key)) return null
        seenName.add(key)
        return {
          ...doc,
          id,
          category: s.category,
          categoryLabel: CATEGORY_LABELS[s.category],
          discoveredVia: 'ai',
        }
      })
    )

    const places = lookups.filter(Boolean)
    return NextResponse.json({ places, region })
  } catch (e: any) {
    console.error('Discover error:', e)
    return NextResponse.json({ places: [], error: e.message }, { status: 200 })
  }
}
