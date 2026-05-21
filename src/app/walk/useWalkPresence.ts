'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * 산책로 실시간 인원수 추적 (Supabase Realtime Presence 기반)
 *
 * - 화면에 보이는 산책로 ID 리스트 → 각 ID마다 채널 구독 (count 표시용)
 * - "산책 시작" 토글: 해당 채널에 본인을 track → 다른 사용자에게 카운트 +1
 * - DB 쓰기 없음. 휘발성. 앱 닫으면 자동 -1.
 */
export function useWalkPresence(
  trailIds: string[],
  selfId: string,
  selfNick: string,
) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [activeTrail, setActiveTrail] = useState<string | null>(null)
  const channelsRef = useRef<Record<string, RealtimeChannel>>({})
  const supabase = createClient()

  // 표시 대상이 바뀔 때 채널 구독 동기화
  useEffect(() => {
    if (!selfId) return

    const want = new Set(trailIds)
    const have = new Set(Object.keys(channelsRef.current))

    // 1) 더 이상 안 보이는 채널 정리
    have.forEach(id => {
      if (!want.has(id)) {
        const ch = channelsRef.current[id]
        if (ch) supabase.removeChannel(ch)
        delete channelsRef.current[id]
        setCounts(prev => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      }
    })

    // 2) 새로 생긴 채널 구독
    trailIds.forEach(id => {
      if (channelsRef.current[id]) return
      const ch = supabase.channel(`walk:${id}`, {
        config: { presence: { key: selfId } },
      })
      ch.on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState()
        const n = Object.keys(state).length
        setCounts(prev => ({ ...prev, [id]: n }))
      })
      ch.subscribe()
      channelsRef.current[id] = ch
    })
  }, [trailIds.join(','), selfId])

  // 컴포넌트 언마운트 시 전체 정리
  useEffect(() => {
    return () => {
      Object.values(channelsRef.current).forEach(ch => supabase.removeChannel(ch))
      channelsRef.current = {}
    }
  }, [])

  const startWalking = useCallback(async (trailId: string) => {
    if (!selfId) return
    // 이미 다른 곳에서 산책 중이면 먼저 untrack
    if (activeTrail && activeTrail !== trailId) {
      const prev = channelsRef.current[activeTrail]
      if (prev) await prev.untrack()
    }
    const ch = channelsRef.current[trailId]
    if (!ch) return
    await ch.track({ user_id: selfId, nickname: selfNick, joined_at: Date.now() })
    setActiveTrail(trailId)
  }, [selfId, selfNick, activeTrail])

  const stopWalking = useCallback(async () => {
    if (!activeTrail) return
    const ch = channelsRef.current[activeTrail]
    if (ch) await ch.untrack()
    setActiveTrail(null)
  }, [activeTrail])

  return { counts, activeTrail, startWalking, stopWalking }
}

/** 로그인 안 한 경우 브라우저 로컬 UUID 생성/재사용 */
export function getOrCreateAnonId(): string {
  if (typeof window === 'undefined') return ''
  const KEY = 'pettogether_anon_id'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = `anon-${crypto.randomUUID()}`
    localStorage.setItem(KEY, id)
  }
  return id
}
