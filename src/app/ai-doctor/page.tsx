'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Stethoscope, TriangleAlert } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string }

const QUICK_QUESTIONS = [
  '강아지가 구토를 자주 해요',
  '고양이가 밥을 안 먹어요',
  '강아지 눈에 눈꼽이 많이 껴요',
  '고양이가 화장실을 자주 가요',
  '강아지가 다리를 절어요',
  '반려동물 예방접종 일정 알려주세요',
]

export default function AIDoctorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '안녕하세요! 저는 PetTogether AI 닥터입니다 🩺\n\n반려동물의 건강 관련 궁금한 점을 자유롭게 질문해주세요. 수의사 관점에서 도움을 드리겠습니다.\n\n⚠️ AI 상담은 참고용이며, 정확한 진단은 반드시 동물병원에서 받으세요.'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/gemini/doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || '죄송합니다, 답변을 가져오지 못했습니다.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '오류가 발생했습니다. 다시 시도해주세요.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-4">
        <Stethoscope className="text-[#f5c518]" size={22} />
        <h1 className="text-xl font-bold text-[#2d2d2d]">AI 닥터</h1>
        <span className="text-xs text-[#aaa]">수의사 AI · Gemini 2.5 Flash</span>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4 flex items-start gap-2">
        <TriangleAlert size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700">AI 상담은 참고용입니다. 정확한 진단·치료는 반드시 가까운 동물병원을 방문하세요.</p>
      </div>

      {/* 빠른 질문 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_QUESTIONS.map((q, i) => (
          <button key={i} onClick={() => send(q)}
            className="text-xs bg-white border border-[#ececec] rounded-full px-3 py-1.5 hover:border-[#f5c518] hover:text-[#f5c518] transition-colors">
            {q}
          </button>
        ))}
      </div>

      {/* 채팅창 */}
      <div className="bg-white rounded-2xl border border-[#ececec] flex flex-col" style={{ height: '55vh' }}>
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-[#f5e97a] flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-0.5">🩺</div>
              )}
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-[#f5c518] text-white rounded-tr-sm'
                  : 'bg-[#f5f5f5] text-[#2d2d2d] rounded-tl-sm'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-[#f5e97a] flex items-center justify-center text-sm mr-2">🩺</div>
              <div className="bg-[#f5f5f5] rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#ccc] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#ccc] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[#ccc] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-[#ececec] px-4 py-3">
          <form onSubmit={e => { e.preventDefault(); send(input) }} className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="반려동물 증상이나 건강 질문을 입력하세요..."
              className="flex-1 border border-[#ececec] rounded-full px-4 py-2 text-sm outline-none focus:border-[#f5c518]"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}
              className="bg-[#f5c518] hover:bg-[#e0b010] text-white rounded-full p-2.5 transition disabled:opacity-40">
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
