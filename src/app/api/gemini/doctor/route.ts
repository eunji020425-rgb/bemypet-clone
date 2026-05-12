import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_PROMPT = `당신은 10년 이상 경력의 전문 수의사입니다. 반려동물 보호자의 질문에 친절하고 전문적으로 답변합니다.

원칙:
- 증상의 가능한 원인과 대처법을 명확히 설명
- 위급 상황이면 즉시 동물병원 방문 권고
- 약 처방·진단은 하지 않고 병원 방문 안내
- 예방법과 일상 관리법 함께 안내
- 한국어로 간결하고 이해하기 쉽게 답변`

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()
    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    })

    // 마지막 메시지(사용자 질문)는 sendMessage로 보내고 나머지는 history
    const recentMessages = messages.slice(-6)
    let historyMessages = recentMessages.slice(0, -1)
    // Gemini는 history의 첫 메시지가 반드시 'user' 역할이어야 함
    const firstUserIdx = historyMessages.findIndex((m: any) => m.role === 'user')
    if (firstUserIdx === -1) {
      historyMessages = []
    } else {
      historyMessages = historyMessages.slice(firstUserIdx)
    }
    const history = historyMessages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

    const chat = model.startChat({ history })
    const lastMessage = recentMessages[recentMessages.length - 1].content
    const result = await chat.sendMessageStream(lastMessage)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) controller.enqueue(encoder.encode(text))
          }
        } catch (e) {
          console.error('Stream error:', e)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  } catch (e: any) {
    console.error('Doctor API error:', e)
    return new Response(JSON.stringify({ error: e.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
