import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

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
    const { lat, lng, petType } = await request.json()

    // 1. 카카오로 실제 공원/산책로/둘레길 위치 검색 (여러 키워드)
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
    // 거리순 정렬 후 상위 10개만
    allParks.sort((a, b) => a.distance - b.distance)
    const parks = allParks.slice(0, 10)

    if (parks.length === 0) {
      return NextResponse.json({ trails: [], error: '근처에 산책 가능한 공원이 없습니다.' })
    }

    // 2. Gemini로 각 공원에 대한 산책 정보 보강
    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
      // Gemini 키 없으면 카카오 데이터만 반환
      return NextResponse.json({
        trails: parks.map(p => ({
          ...p,
          difficulty: '보통',
          description: p.category,
          tip: `${petType}와(과) 함께 산책하기 좋은 곳입니다.`,
          features: ['산책로'],
        })),
      })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })

    const prompt = `당신은 반려동물 산책 전문가입니다. 다음 한국의 공원/산책로 목록을 ${petType || '강아지'}와(과) 함께 산책하기에 어떤지 평가해주세요.

각 장소에 대해 다음 정보를 한국어로 JSON 배열로 반환:

[
  {
    "name": "장소 이름(입력과 동일)",
    "difficulty": "쉬움 또는 보통 또는 어려움 중 하나",
    "description": "장소 특징과 산책 환경 설명 (2-3문장, 한국어)",
    "tip": "${petType || '강아지'}와 산책 시 유용한 팁 (1-2문장, 한국어)",
    "features": ["특징1", "특징2", "특징3"]
  }
]

장소 목록:
${parks.map((p, i) => `${i + 1}. ${p.name} (${p.address}) - 카테고리: ${p.category}`).join('\n')}

반드시 입력한 ${parks.length}개의 장소 모두를 같은 순서로 응답해주세요. JSON 배열만 반환하세요.`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    let enrichments: any[] = []
    try {
      enrichments = JSON.parse(text)
      if (!Array.isArray(enrichments)) {
        if (enrichments && Array.isArray((enrichments as any).trails)) {
          enrichments = (enrichments as any).trails
        } else {
          enrichments = []
        }
      }
    } catch {
      enrichments = []
    }

    // 3. 카카오 + Gemini 결합
    const trails = parks.map((park, i) => {
      const enrich = enrichments[i] || {}
      return {
        id: park.id,
        name: park.name,
        address: park.address,
        category: park.category,
        lat: park.lat,
        lng: park.lng,
        distance: park.distance,
        link: park.link,
        difficulty: enrich.difficulty || '보통',
        description: enrich.description || park.category || '',
        tip: enrich.tip || `${petType || '강아지'}와(과) 함께 즐겁게 산책해보세요.`,
        features: Array.isArray(enrich.features) ? enrich.features : ['산책로'],
      }
    })

    return NextResponse.json({ trails })
  } catch (e: any) {
    console.error('Walk API error:', e)
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 })
  }
}
