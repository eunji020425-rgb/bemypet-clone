import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: Request) {
  try {
    const { lat, lng, petType } = await request.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })

    const prompt = `당신은 반려동물 산책 전문가입니다.
좌표 위도 ${lat}, 경도 ${lng} 근처의 반려동물 산책로 5곳을 추천해주세요.
반려동물 종류: ${petType || '강아지'}

각 산책로에 대해 다음 JSON 형식으로 정확히 응답해주세요:

{
  "trails": [
    {
      "name": "산책로 이름",
      "description": "산책로 설명 (2-3문장)",
      "distance": "예상 거리 (예: 2.5km)",
      "duration": "예상 소요 시간 (예: 40분)",
      "difficulty": "난이도 (쉬움/보통/어려움)",
      "features": ["특징1", "특징2"],
      "address": "주소 또는 위치 설명",
      "lat": 위도(숫자),
      "lng": 경도(숫자),
      "tip": "반려동물과 산책 시 팁"
    }
  ]
}`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      const data = JSON.parse(jsonMatch[0])
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ error: 'Failed to parse response', raw: text }, { status: 500 })
    }
  } catch (e: any) {
    console.error('Walk API error:', e)
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 })
  }
}
