import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_PROMPT = `당신은 10년 이상의 경력을 가진 전문 수의사입니다.
반려동물 보호자의 질문에 수의사 관점에서 전문적이고 친절하게 답변해주세요.

답변 원칙:
- 증상을 듣고 가능한 원인과 대처법을 설명합니다
- 위급한 상황이면 즉시 동물병원 방문을 권고합니다
- 약 처방은 하지 않으며, 진단은 반드시 병원에서 받도록 안내합니다
- 예방법과 일상 관리법도 함께 안내합니다
- 한국어로 답변합니다
- 답변은 명확하고 이해하기 쉽게 작성합니다`

export async function POST(request: Request) {
  const { messages } = await request.json()

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-preview-05-20',
    systemInstruction: SYSTEM_PROMPT,
  })

  const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }))

  const chat = model.startChat({ history })
  const lastMessage = messages[messages.length - 1].content
  const result = await chat.sendMessage(lastMessage)
  const text = result.response.text()

  return NextResponse.json({ reply: text })
}
