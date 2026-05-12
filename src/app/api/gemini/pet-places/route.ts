import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const MODEL_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
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

    const prompt = `당신은 한국 애견 동반 장소 전문가입니다. 다음 ${places.length}개의 장소 각각에 대한 일반적인 애견 동반 규정/특징을 한국 업계 평균 기준으로 추정해주세요.

장소 목록:
${places.map((p: any, i: number) => `${i + 1}. ${p.name} (${p.categoryLabel}, ${p.address || '주소불명'}, 카테고리: ${p.rawCategory || ''})`).join('\n')}

각 장소 입력 순서대로 JSON 배열로 답변하세요. 카테고리에 따라 필드 사용:

[
  {
    "category": "restaurant 또는 cafe 또는 playground (입력과 동일)",
    "vaccination": "필수|권장|불필요|확인필요",
    "carrierRequired": true 또는 false,
    "diningArea": "전체|외부석만|특정구역만|해당없음",
    "sizeLimit": "예: 소형견만, 전 견종, 15kg 이하 등",
    "hasOutdoorPlayground": true 또는 false (카페·식당 중 야외 강아지 운동장이 함께 있을 가능성이 있으면 true),
    "grassType": "잔디 종류 - 천연잔디|인조잔디|흙|복합|해당없음",
    "playgroundSize": "운동장 크기 - 소형|중형|대형|해당없음",
    "sizeSeparation": true 또는 false (대소형견 분리 공간 유무),
    "feeInfo": "이용료 - 무료|유료(1인 X원)|음료 1잔 주문 필수|해당없음",
    "hours": "운영시간 추정 (예: 11:00-22:00)",
    "rules": ["규정1", "규정2", "규정3"] (3-5개의 짧은 규정),
    "summary": "한 줄 요약 (예: 야외 운동장 있는 카페, 접종증 필수, 전 견종 가능)"
  }
]

평가 가이드:
- 식당: 접종증 필수, 유모차/이동가방 필수 여부, 실내/외부석 동반, 견종 크기 제한
- 카페: 식당 항목 + "야외 운동장이 같이 있는 카페"인지 (예: 펜션형/도그카페/대형 매장은 가능성 높음)
- 운동장: 잔디 종류, 운동장 크기, 대소형견 분리, 입장료, 운영시간, 배변봉투 제공, 접종/중성화 증명서 필요

장소명에서 단서를 찾으세요:
- "도그파크", "독파크", "애견운동장" → 큰 야외 운동장 있을 가능성 큼
- "도그카페", "강아지 카페" → 실내 위주, 작은 놀이 공간 가능
- "펜션", "글램핑" 결합 → 야외 운동장 있을 가능성 큼

확실하지 않으면 "확인필요" 또는 "방문 전 전화 확인 권장"으로 표기. JSON 배열만 반환하세요.`

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
