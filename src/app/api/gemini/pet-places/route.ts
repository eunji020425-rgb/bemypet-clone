import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// 빠른 응답을 위해 lite 모델 우선
const MODEL_CHAIN = [
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
]

export async function POST(request: Request) {
  try {
    const { places } = await request.json()
    if (!Array.isArray(places) || places.length === 0) {
      return NextResponse.json({ enrichments: [] })
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json({ enrichments: [] })
    }

    const genAI = new GoogleGenerativeAI(apiKey)

    const prompt = `2026년 현재 한국 애견 동반 장소 ${places.length}곳의 규정을 추정하세요.

※ 모든 장소는 이미 "애견동반/도그카페/도그파크" 등 반려동물 친화 키워드로 검색된 결과이므로 기본적으로 동반 가능 장소로 간주하세요.

${places.map((p: any, i: number) => `${i + 1}. ${p.name} [${p.categoryLabel}] ${p.address || ''} / 카카오카테고리: ${p.rawCategory || ''}`).join('\n')}

입력 순서대로 JSON 배열로:
[{
  "petFriendly": "가능|조건부|불가",
  "vaccination": "필수|권장|불필요|확인필요",
  "carrierRequired": true/false,
  "diningArea": "전체|외부석만|특정구역만|해당없음",
  "sizeLimit": "소형견만|전 견종|중대형 가능 등",
  "hasOutdoorPlayground": true/false,
  "grassType": "천연잔디|인조잔디|흙|복합|해당없음",
  "playgroundSize": "소형|중형|대형|해당없음",
  "sizeSeparation": true/false,
  "feeInfo": "무료|유료|음료주문필수|해당없음",
  "hours": "예: 11:00-22:00",
  "rules": ["짧은 규정 3개"],
  "summary": "한줄 요약"
}]

petFriendly 판단 (관대하게):
- 기본값: "가능" (검색 결과이므로 신뢰)
- "조건부": 일반 음식점 카테고리지만 외부석/특정 구역만 가능한 곳
- "불가": 명확히 동반 불가가 확실한 곳만 (예: 약국, 종합병원, 마트, 은행, 일반 사무실 등 펫과 무관한 업종)

확신 없으면 "가능" 또는 "조건부"로. JSON 배열만 반환.`

    let text = ''
    for (const modelName of MODEL_CHAIN) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: 'application/json' },
        })
        const result = await model.generateContent(prompt)
        text = result.response.text()
        if (text) break
      } catch (e: any) {
        console.log(`[pet-places-enrich] ${modelName} failed: ${e?.message?.slice(0, 200)}`)
        continue
      }
    }

    if (!text) {
      return NextResponse.json({ enrichments: [] })
    }

    let enrichments: any[] = []
    try {
      const parsed = JSON.parse(text)
      enrichments = Array.isArray(parsed) ? parsed : parsed.places || []
    } catch {
      enrichments = []
    }
    return NextResponse.json({ enrichments })
  } catch (e: any) {
    console.error('Pet places enrich error:', e)
    return NextResponse.json({ enrichments: [], error: e.message }, { status: 200 })
  }
}
