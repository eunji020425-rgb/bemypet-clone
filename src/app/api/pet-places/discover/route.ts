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

// 폐업/이전/휴업 키워드 (이름에 포함되면 제외)
const CLOSED_KEYWORDS = ['폐업', '폐점', '휴업', '이전', '종료', '임시휴업', '리뉴얼중', '공사중']

// 이름 유사도 (단순 문자 겹침 비율)
function nameSimilarity(a: string, b: string): number {
  const cleanA = a.replace(/[\s()【】\[\]·]/g, '').toLowerCase()
  const cleanB = b.replace(/[\s()【】\[\]·]/g, '').toLowerCase()
  if (!cleanA || !cleanB) return 0
  const shorter = cleanA.length < cleanB.length ? cleanA : cleanB
  const longer = cleanA.length < cleanB.length ? cleanB : cleanA
  let matches = 0
  // 짧은 문자열의 2-gram이 긴 문자열에 얼마나 들어있는지
  for (let i = 0; i < shorter.length - 1; i++) {
    const bigram = shorter.slice(i, i + 2)
    if (longer.includes(bigram)) matches++
  }
  return shorter.length > 1 ? matches / (shorter.length - 1) : (cleanA === cleanB ? 1 : 0)
}

// 카테고리별 키워드 매칭으로 카카오 결과 검증
function categoryMatches(rawCategory: string, suggestedCategory: string): boolean {
  if (!rawCategory) return true
  const cat = rawCategory.toLowerCase()
  if (suggestedCategory === 'restaurant') {
    return /음식점|식당|레스토랑|한식|양식|일식|중식|분식|패스트푸드|치킨|피자|고기|족발|보쌈|찜|구이|국밥|면|덮밥|뷔페|푸드/.test(cat)
  }
  if (suggestedCategory === 'cafe') {
    return /카페|커피|디저트|베이커리|빵|디저트|커피전문점|차/.test(cat)
  }
  if (suggestedCategory === 'playground') {
    return /애견|반려|동물|펜션|글램핑|캠핑|공원|놀이/.test(cat)
  }
  return true
}

async function kakaoLookup(query: string, suggestedCategory: string, lat: number, lng: number) {
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
    const docs = data.documents || []
    if (docs.length === 0) return null

    // 검증: 폐업 키워드 없고, 이름 유사도 ≥ 0.6, 카테고리 매칭
    for (const doc of docs) {
      const name = doc.place_name || ''
      if (CLOSED_KEYWORDS.some(kw => name.includes(kw))) continue
      if (nameSimilarity(query, name) < 0.5) continue
      if (!categoryMatches(doc.category_name || '', suggestedCategory)) continue
      // place_url 없으면 카카오맵에 등록 안 됨 = 신뢰도 낮음
      if (!doc.place_url) continue
      return {
        id: doc.id,
        name,
        address: doc.road_address_name || doc.address_name || '',
        phone: doc.phone,
        lat: parseFloat(doc.y),
        lng: parseFloat(doc.x),
        distance: doc.distance ? parseFloat(doc.distance) / 1000 : undefined,
        link: doc.place_url,
        rawCategory: doc.category_name,
      }
    }
    return null
  } catch {
    return null
  }
}

async function getGeminiPetPlaces(region: string): Promise<{ name: string; category: 'restaurant' | 'cafe' | 'playground' }[]> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey || !region) return []

  const genAI = new GoogleGenerativeAI(apiKey)

  const prompt = `한국 ${region} 지역의 **2024년 이후에도 현재 영업 중인** 유명 애견 동반 장소를 추천하세요.

조건:
- 폐업, 이전, 휴업한 곳 제외
- 임시 팝업/이벤트 장소 제외
- SNS/블로그/네이버지도/카카오맵에서 검색 가능한 실제 상호명만
- 추측이 아니라 확실히 아는 장소만 (모르면 빈 배열)

카테고리:
- restaurant: 애견 동반 식당
- cafe: 애견 카페, 도그카페 (야외 운동장 있는 곳 포함)
- playground: 애견 운동장, 도그파크, 펜션 부설 운동장

JSON 배열만:
[
  { "name": "정확한 상호명 (지역명 포함 가능)", "category": "restaurant|cafe|playground" }
]

확신 있는 곳만 최대 20개. 모르면 짧게 답하세요.`

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
        const doc = await kakaoLookup(s.name, s.category, lat, lng)
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
