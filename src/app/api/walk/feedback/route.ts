import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * 산책로 규정 정보에 대한 사용자 피드백
 * body: { trail_id: string, type: 'confirm' | 'dispute' }
 * - confirm → user_confirms++
 * - dispute → user_disputes++ (+ disputes >= 3 이면 confidence 감소)
 */
export async function POST(request: Request) {
  try {
    const { trail_id, type } = await request.json()
    if (!trail_id || !['confirm', 'dispute'].includes(type)) {
      return NextResponse.json({ error: 'bad request' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    if (!url || !key) return NextResponse.json({ error: 'no db' }, { status: 500 })
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    // 현재 값 조회
    const { data: row } = await supabase
      .from('walk_rules')
      .select('user_confirms, user_disputes, confidence')
      .eq('trail_id', trail_id)
      .maybeSingle()

    if (!row) {
      // 캐시에 없으면 새 row를 만들 수 없음 (AI 분석 안된 산책로) — 무시
      return NextResponse.json({ ok: true, skipped: true })
    }

    if (type === 'confirm') {
      const next = (row.user_confirms ?? 0) + 1
      const newConfidence = Math.min((row.confidence ?? 0.5) + 0.05, 1.0)
      await supabase.from('walk_rules').update({
        user_confirms: next,
        confidence: newConfidence,
      }).eq('trail_id', trail_id)
      return NextResponse.json({ ok: true, user_confirms: next, confidence: newConfidence })
    } else {
      const next = (row.user_disputes ?? 0) + 1
      // 분쟁 3건 이상이면 confidence 0.3까지 떨어뜨림
      const newConfidence = next >= 3 ? Math.min(row.confidence ?? 0.5, 0.3) : row.confidence
      await supabase.from('walk_rules').update({
        user_disputes: next,
        confidence: newConfidence,
      }).eq('trail_id', trail_id)
      return NextResponse.json({ ok: true, user_disputes: next, confidence: newConfidence })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 })
  }
}
