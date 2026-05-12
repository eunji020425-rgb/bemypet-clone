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

    const prompt = `한국 애견 동반 장소 ${places.length}곳의 일반적 규정을 평균 기준으로 추정하세요.

${places.map((p: any, i: number) => `${i + 1}. ${p.name} [${p.categoryLabel}] ${p.address || ''}`).join('\n')}

입력 순서대로 JSON 배열:
[{
  "vaccination": "필수|권장|불필요|확인필요",
  "carrierRequired": true/false,
  "diningArea": "전체|외부석만|특정구역만|해당없음",
  "sizeLimit": "소형견만|전 견종|중대형 가능 등",
  "hasOutdoorPlayground": true/false (이름에 도그파크/펜션/대형이면 true),
  "grassType": "천연잔디|인조잔디|흙|복합|해당없음",
  "playgroundSize": "소형|중형|대형|해당없음",
  "sizeSeparation": true/false,
  "feeInfo": "무료|유료|음료주문필수|해당없음",
  "hours": "예: 11:00-22:00",
  "rules": ["짧은 규정 3개"],
  "summary": "한줄 요약"
}]

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
