import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: Request) {
  try {
    const { parks, petType } = await request.json()
    if (!Array.isArray(parks) || parks.length === 0) {
      return NextResponse.json({ enrichments: [] })
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json({ enrichments: [] })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })

    const prompt = `한국의 ${petType || '강아지'} 산책 전문가로서 다음 공원 ${parks.length}곳을 평가해주세요.

각 장소를 입력 순서대로 JSON 배열로:
[
  {
    "difficulty": "쉬움|보통|어려움",
    "description": "특징과 환경 (2문장)",
    "tip": "산책 팁 (1문장)",
    "features": ["특징1","특징2","특징3"]
  }
]

장소:
${parks.map((p: any, i: number) => `${i + 1}. ${p.name} (${p.address})`).join('\n')}`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    let enrichments: any[] = []
    try {
      const parsed = JSON.parse(text)
      enrichments = Array.isArray(parsed) ? parsed : parsed.trails || []
    } catch {
      enrichments = []
    }
    return NextResponse.json({ enrichments })
  } catch (e: any) {
    console.error('Walk enrich error:', e)
    return NextResponse.json({ enrichments: [], error: e.message }, { status: 200 })
  }
}
