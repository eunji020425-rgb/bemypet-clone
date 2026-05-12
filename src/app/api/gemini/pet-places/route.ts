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

    const prompt = `2026년 현재 한국 애견 동반 장소 ${places.length}곳을 평가하세요.

${places.map((p: any, i: number) => `${i + 1}. ${p.name} [${p.categoryLabel}] ${p.address || ''} / 카카오카테고리: ${p.rawCategory || ''}`).join('\n')}

각 장소가:
1. 실제로 반려동물 동반이 가능한 업종인지 (장소명·카테고리로 판단)
2. 일반적인 동반 규정

입력 순서대로 JSON 배열로:
[{
  "petFriendly": "가능|조건부|불가" (불가: 일반 식당/병원/사무실/마트 등 동반 불가능 업종, 조건부: 외부석만 등 일부만 가능, 가능: 전체 동반 OK),
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

petFriendly 판단 가이드 (엄격하게):
- 이름/카테고리가 일반 음식점·일반 카페·병원·약국·세탁소·마트 → "불가"
- 도그카페·애견동반카페·애견동반식당·도그파크·애견운동장·펜션 → "가능"
- 키즈카페·일반음식점인데 외부석에서만 가능하다고 알려진 곳 → "조건부"

JSON 배열만 반환.`

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
