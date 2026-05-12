import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_PROMPT = `당신은 10년 이상 경력의 전문 수의사입니다. 반려동물 보호자의 질문에 친절하고 전문적으로 답변합니다.

원칙:
- 증상의 가능한 원인과 대처법을 명확히 설명
- 위급 상황이면 즉시 동물병원 방문 권고
- 약 처방·진단은 하지 않고 병원 방문 안내
- 예방법과 일상 관리법 함께 안내
- 한국어로 간결하고 이해하기 쉽게 답변`

// 폴백 체인: 2.5 → 2.0 → 1.5 (할당량 초과 시 다른 모델로 자동 전환)
const MODEL_CHAIN = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']

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

    // 대화 기록 준비
    const recentMessages = messages.slice(-6)
    let historyMessages = recentMessages.slice(0, -1)
    const firstUserIdx = historyMessages.findIndex((m: any) => m.role === 'user')
    if (firstUserIdx === -1) historyMessages = []
    else historyMessages = historyMessages.slice(firstUserIdx)
    const history = historyMessages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))
    const lastMessage = recentMessages[recentMessages.length - 1].content

    // 모델 폴백 체인 시도
    let lastError: any = null
    for (const modelName of MODEL_CHAIN) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_PROMPT,
        })
        const chat = model.startChat({ history })
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
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'X-Model-Used': modelName,
          },
        })
      } catch (e: any) {
        lastError = e
        const msg = String(e?.message || '')
        // 429(할당량) 또는 503(과부하)이면 다음 모델 시도
        if (msg.includes('429') || msg.includes('quota') || msg.includes('503') || msg.includes('overloaded')) {
          console.log(`[doctor] ${modelName} unavailable, trying next model...`)
          continue
        }
        // 다른 에러는 즉시 반환
        throw e
      }
    }

    // 모든 모델 실패
    return new Response(
      JSON.stringify({
        error: '잠시 후 다시 시도해주세요. 현재 AI 서비스가 매우 혼잡합니다.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e: any) {
    console.error('Doctor API error:', e)
    const msg = String(e?.message || '')
    let userMsg = '오류가 발생했습니다. 다시 시도해주세요.'
    if (msg.includes('429') || msg.includes('quota')) {
      userMsg = '잠시 후 다시 시도해주세요. AI 사용량이 일시적으로 초과되었습니다.'
    }
    return new Response(JSON.stringify({ error: userMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
