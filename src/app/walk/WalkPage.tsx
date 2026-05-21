'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigation, ExternalLink, Footprints, Users } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import { createClient } from '@/lib/supabase/client'
import { useWalkPresence, getOrCreateAnonId } from './useWalkPresence'

interface Trail {
  id: string
  name: string
  address: string
  category?: string
  lat: number
  lng: number
  distance: number
  link?: string
  difficulty?: string
  popularity?: string
  length?: string
  description?: string
  tip?: string
  features?: string[]
  enriching?: boolean
}

const POP_COLOR: Record<string, string> = {
  '한산': 'text-blue-600 bg-blue-50 border-blue-200',
  '보통': 'text-green-600 bg-green-50 border-green-200',
  '붐빔': 'text-orange-600 bg-orange-50 border-orange-200',
  '매우 붐빔': 'text-red-600 bg-red-50 border-red-200',
}

const DIFF_COLOR: Record<string, string> = {
  '쉬움': 'text-green-600 bg-green-50 border-green-200',
  '보통': 'text-yellow-600 bg-yellow-50 border-yellow-200',
  '어려움': 'text-red-600 bg-red-50 border-red-200',
}

/** 인원수에 따라 마커 색상/배지 다르게 */
function makeMarkerIcon(L: any, index: number, count: number) {
  // 인원수 색: 0 = 연두, 1-2 = 파랑, 3+ = 진파랑 (Live!)
  const bg = count >= 3 ? '#1d4ed8' : count >= 1 ? '#3b82f6' : '#86efac'
  const badge = count > 0
    ? `<div style="position:absolute;top:-6px;right:-6px;background:#ef4444;color:white;font-size:10px;font-weight:bold;min-width:18px;height:18px;border-radius:9px;border:2px solid white;display:flex;align-items:center;justify-content:center;padding:0 4px;z-index:10">${count}</div>`
    : ''
  return L.divIcon({
    html: `<div style="position:relative;width:36px;height:42px;cursor:pointer">
      <div style="background:${bg};color:white;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);position:absolute;top:0;left:0;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
        <span style="transform:rotate(45deg);font-size:11px;font-weight:bold;color:white">${index + 1}</span>
      </div>
      ${badge}
    </div>`,
    className: '', iconAnchor: [18, 42],
  })
}

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function WalkPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const lastSearchCenterRef = useRef<[number, number] | null>(null)
  const [trails, setTrails] = useState<Trail[]>([])
  const [loading, setLoading] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const [selected, setSelected] = useState<Trail | null>(null)
  const [error, setError] = useState('')
  const [locStatus, setLocStatus] = useState<'idle' | 'locating' | 'success' | 'denied' | 'fallback'>('idle')
  const [locError, setLocError] = useState('')
  const [showResearchBtn, setShowResearchBtn] = useState(false)
  const [selfId, setSelfId] = useState<string>('')
  const [selfNick, setSelfNick] = useState<string>('산책러')
  const [selfIsAuth, setSelfIsAuth] = useState(false)

  // 로그인 사용자 또는 익명 ID 확보
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setSelfId(data.user.id)
        setSelfIsAuth(true)
        setSelfNick(
          (data.user.user_metadata?.nickname as string) ||
          (data.user.user_metadata?.name as string) ||
          (data.user.email?.split('@')[0]) ||
          '산책러'
        )
      } else {
        setSelfId(getOrCreateAnonId())
        setSelfIsAuth(false)
      }
    })
  }, [])

  // 화면에 보이는 산책로 ID들 (메모이즈)
  const trailIds = useMemo(() => trails.map(t => t.id), [trails])
  const { counts, activeTrail, startWalking, stopWalking } = useWalkPresence(trailIds, selfId, selfNick, selfIsAuth)

  const startWalkingFor = (t: Trail) => startWalking({ id: t.id, name: t.name, lat: t.lat, lng: t.lng })

  const initMap = async (lat: number, lng: number, items: Trail[]) => {
    if (typeof window === 'undefined') return
    const L = (await import('leaflet')).default

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current!).setView([lat, lng], 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(mapInstanceRef.current)
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100)
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 500)

      mapInstanceRef.current.on('moveend', () => {
        const center = mapInstanceRef.current.getCenter()
        const last = lastSearchCenterRef.current
        if (!last) return
        const dist = calcDistance(last[0], last[1], center.lat, center.lng)
        setShowResearchBtn(dist > 1)
      })
    } else {
      mapInstanceRef.current.setView([lat, lng], 13)
      mapInstanceRef.current.invalidateSize()
    }

    const myLat = userPos?.[0] ?? lat
    const myLng = userPos?.[1] ?? lng
    const myIcon = L.divIcon({
      html: `<div style="background:#3b82f6;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.2)"></div>`,
      className: '', iconAnchor: [9, 9],
    })
    const myMarker = L.marker([myLat, myLng], { icon: myIcon })
      .addTo(mapInstanceRef.current)
      .bindPopup('📍 현재 위치')
    markersRef.current.push(myMarker)

    items.forEach((t, i) => {
      if (!t.lat || !t.lng) return
      const marker = L.marker([t.lat, t.lng], { icon: makeMarkerIcon(L, i, 0) })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>${t.name}</b><br/>${t.address ?? ''}<br/>${t.distance.toFixed(1)}km`)
      marker.on('click', () => setSelected(t))
      ;(marker as any)._trailId = t.id
      ;(marker as any)._trailIndex = i
      markersRef.current.push(marker)
    })

    if (items.length > 0) {
      const bounds = L.latLngBounds([[lat, lng], ...items.map(t => [t.lat, t.lng] as [number, number])])
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }
  }

  const enrichWithGemini = async (parks: Trail[]) => {
    setEnriching(true)
    try {
      const res = await fetch('/api/gemini/walk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parks, petType: '강아지' }),
      })
      const data = await res.json()
      const enrichments = data.enrichments || []
      setTrails(prev =>
        prev.map((t, i) => ({
          ...t,
          difficulty: enrichments[i]?.difficulty,
          popularity: enrichments[i]?.popularity,
          length: enrichments[i]?.length,
          description: enrichments[i]?.description,
          tip: enrichments[i]?.tip,
          features: Array.isArray(enrichments[i]?.features) ? enrichments[i].features : undefined,
          enriching: false,
        }))
      )
      setSelected(prev => {
        if (!prev) return prev
        const idx = parks.findIndex(p => p.id === prev.id)
        if (idx === -1) return prev
        return {
          ...prev,
          difficulty: enrichments[idx]?.difficulty,
          popularity: enrichments[idx]?.popularity,
          length: enrichments[idx]?.length,
          description: enrichments[idx]?.description,
          tip: enrichments[idx]?.tip,
          features: Array.isArray(enrichments[idx]?.features) ? enrichments[idx].features : undefined,
        }
      })
    } finally {
      setEnriching(false)
    }
  }

  const recommend = async (lat: number, lng: number, rect?: string) => {
    setLoading(true)
    setError('')
    lastSearchCenterRef.current = [lat, lng]
    setShowResearchBtn(false)
    try {
      // 1단계: 카카오에서 공원 즉시 가져오기 (빠름)
      const res = await fetch('/api/walks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, rect }),
      })
      const data = await res.json()
      const parks: Trail[] = (data.parks || []).map((p: Trail) => ({ ...p, enriching: true }))
      setTrails(parks)
      await initMap(lat, lng, parks)
      setLoading(false)

      // 2단계: 백그라운드에서 Gemini로 정보 채우기
      if (parks.length > 0) {
        enrichWithGemini(parks)
      }
    } catch (e: any) {
      setError('산책로 추천을 가져오지 못했습니다. 다시 시도해주세요.')
      setTrails([])
      setLoading(false)
    }
  }

  const locate = () => {
    if (!navigator.geolocation) {
      setLocStatus('fallback')
      setLocError('이 브라우저는 위치 정보를 지원하지 않습니다.')
      const lat = 37.5665, lng = 126.978
      setUserPos([lat, lng])
      recommend(lat, lng)
      return
    }
    setLoading(true)
    setLocStatus('locating')
    setLocError('')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords
        setUserPos([lat, lng])
        setLocStatus('success')
        recommend(lat, lng)
      },
      (err) => {
        setLocStatus(err.code === 1 ? 'denied' : 'fallback')
        setLocError(
          err.code === 1
            ? '위치 권한이 거부되었습니다. 주소창 좌측 자물쇠 아이콘에서 위치 권한을 허용해주세요.'
            : err.code === 2
            ? '위치를 가져올 수 없습니다. GPS/네트워크 상태를 확인해주세요.'
            : '위치 요청 시간이 초과되었습니다.'
        )
        const lat = 37.5665, lng = 126.978
        setUserPos([lat, lng])
        recommend(lat, lng)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    locate()
    return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null }
  }, [])

  // 인원수 변동 → 마커 아이콘 갱신
  useEffect(() => {
    if (typeof window === 'undefined') return
    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled) return
      markersRef.current.forEach((m: any) => {
        const tid = m._trailId
        if (!tid) return  // 내 위치 마커는 _trailId 없음
        const idx = m._trailIndex ?? 0
        const c = counts[tid] ?? 0
        m.setIcon(makeMarkerIcon(L, idx, c))
      })
    })()
    return () => { cancelled = true }
  }, [counts])

  return (
    <div className="flex flex-col gap-4">
      {/* 컨트롤 */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={locate}
          disabled={loading}
          className="flex items-center gap-2 bg-[#3a7ab8] hover:bg-[#1a2a3f] text-white px-5 py-2 rounded-full text-sm font-bold transition disabled:opacity-60"
        >
          <Navigation size={15} />
          {loading ? '검색 중...' : '내 위치로 추천받기'}
        </button>
        {enriching && (
          <span className="text-xs text-[#888] flex items-center gap-1">
            <span className="inline-block w-3 h-3 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
            AI가 산책 정보를 분석 중...
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-xs text-red-700">{error}</div>
      )}

      {locStatus === 'locating' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-xs text-blue-700">
          📍 현재 위치를 확인하는 중...
        </div>
      )}
      {locStatus === 'success' && userPos && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-xs text-green-700">
          ✅ 현재 위치 기준 추천 (반경 20km 내 공원·산책로)
        </div>
      )}
      {activeTrail && (
        <div className="bg-gradient-to-r from-[#3a7ab8] to-[#22c55e] text-white rounded-xl px-4 py-3 text-sm font-bold flex items-center justify-between shadow-md">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            🐾 산책 중 — <span className="underline">{trails.find(t => t.id === activeTrail)?.name ?? '산책로'}</span>
            <span className="text-white/80 font-normal text-xs">· 같이 걷는 사람 {(counts[activeTrail] ?? 1) - 1}명</span>
          </span>
          <button
            onClick={stopWalking}
            className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1 rounded-full transition"
          >
            산책 종료
          </button>
        </div>
      )}
      {(locStatus === 'denied' || locStatus === 'fallback') && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-700 flex items-center justify-between gap-2">
          <span>⚠️ {locError} 서울 기준 표시</span>
          <button onClick={locate} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
            다시 시도
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="lg:w-3/5 relative">
          <div ref={mapRef} className="w-full rounded-2xl overflow-hidden border border-[#d6e6ff]" style={{ height: '550px' }} />
          {showResearchBtn && (
            <button
              onClick={() => {
                const map = mapInstanceRef.current
                const c = map.getCenter()
                const b = map.getBounds()
                const sw = b.getSouthWest()
                const ne = b.getNorthEast()
                const rect = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`
                recommend(c.lat, c.lng, rect)
              }}
              disabled={loading}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-[#3a7ab8] hover:bg-[#1a2a3f] text-white font-bold text-sm px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 disabled:opacity-70"
            >
              <Navigation size={14} />
              이 지역에서 다시 검색
            </button>
          )}
        </div>

        <div className="lg:w-2/5 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '550px' }}>
          <p className="text-xs text-[#aaa] px-1 pb-1">총 {trails.length}개의 산책로 추천</p>
          {loading && trails.length === 0 && (
            <div className="text-center py-10 text-[#aaa] text-sm">
              <div className="text-3xl mb-2 animate-bounce">🐾</div>
              산책로를 검색 중...
            </div>
          )}
          {!loading && trails.length === 0 && !error && (
            <div className="text-center py-10 text-[#aaa] text-sm">위치를 기반으로 산책로를 추천받으세요!</div>
          )}
          {trails.map((t, i) => {
            const isSelected = selected?.id === t.id
            return (
              <div
                key={t.id}
                onClick={() => {
                  setSelected(t)
                  mapInstanceRef.current?.setView([t.lat, t.lng], 16)
                  markersRef.current[i + 1]?.openPopup()
                }}
                className={`bg-white rounded-xl p-3 border cursor-pointer transition-colors ${isSelected ? 'border-[#3a7ab8] shadow-md' : 'border-[#d6e6ff] hover:border-[#22c55e]'}`}
              >
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-green-300 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[#2a3a55] truncate flex-1">{t.name}</p>
                      {(counts[t.id] ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          {counts[t.id]}명
                        </span>
                      )}
                      <span className="text-xs text-[#22c55e] font-medium flex-shrink-0">
                        {t.distance < 1 ? `${Math.round(t.distance * 1000)}m` : `${t.distance.toFixed(1)}km`}
                      </span>
                    </div>
                    <p className="text-xs text-[#888] truncate mt-0.5">{t.address}</p>
                    {/* 산책 시작/종료 토글 (리스트에서 바로) */}
                    <div className="flex items-center gap-2 mt-2">
                      {activeTrail === t.id ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); stopWalking() }}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 transition"
                        >
                          <Footprints size={11} /> 산책 종료
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); startWalkingFor(t) }}
                          disabled={!selfId}
                          className="bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-60 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 transition"
                        >
                          <Footprints size={11} /> 산책 시작
                        </button>
                      )}
                      <span className="text-xs text-[#6a7c95]">
                        <Users size={11} className="inline mr-0.5" />
                        지금 {counts[t.id] ?? 0}명
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {t.difficulty && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${DIFF_COLOR[t.difficulty] ?? 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                          {t.difficulty}
                        </span>
                      )}
                      {t.popularity && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${POP_COLOR[t.popularity] ?? 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                          👥 {t.popularity}
                        </span>
                      )}
                      {t.length && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] border border-[#fde68a] font-medium">
                          📏 {t.length}
                        </span>
                      )}
                      {t.enriching && !t.difficulty && (
                        <span className="text-xs text-[#aaa] italic">AI 분석 중...</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selected && (
        <div className="bg-[#f0fdf4] border border-green-300 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-bold text-[#2a3a55]">🐾 {selected.name}</h3>
                {selected.difficulty && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${DIFF_COLOR[selected.difficulty] ?? 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                    {selected.difficulty}
                  </span>
                )}
                {selected.popularity && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${POP_COLOR[selected.popularity] ?? 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                    👥 {selected.popularity}
                  </span>
                )}
                {selected.length && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] border border-[#fde68a] font-medium">
                    📏 {selected.length}
                  </span>
                )}
              </div>
              {selected.address && <p className="text-xs text-[#666] mt-1">{selected.address}</p>}
              {selected.description && <p className="text-sm text-[#444] mt-2 leading-relaxed">{selected.description}</p>}
              {!selected.description && selected.enriching && (
                <p className="text-sm text-[#aaa] italic mt-2">AI가 산책 정보를 분석 중입니다...</p>
              )}
              {selected.tip && (
                <div className="mt-3 bg-white rounded-lg px-3 py-2 text-xs text-[#3a7ab8] border border-yellow-200">
                  💡 <strong>산책 팁:</strong> {selected.tip}
                </div>
              )}
              {selected.features && selected.features.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selected.features.map((f, j) => (
                    <span key={j} className="text-xs bg-white px-2 py-0.5 rounded-full text-[#666] border border-[#d6e6ff]">{f}</span>
                  ))}
                </div>
              )}
              {/* 실시간 인원수 + 산책 시작/종료 */}
              <div className="mt-3 flex items-center gap-2 flex-wrap bg-white rounded-xl px-3 py-2 border border-[#d6e6ff]">
                <Users size={14} className="text-[#3a7ab8]" />
                <span className="text-sm text-[#2a3a55]">
                  지금 <strong className="text-[#3a7ab8]">{counts[selected.id] ?? 0}명</strong> 산책 중
                </span>
                <span className="flex-1" />
                {activeTrail === selected.id ? (
                  <button
                    onClick={stopWalking}
                    className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 transition"
                  >
                    <Footprints size={12} /> 산책 종료
                  </button>
                ) : (
                  <button
                    onClick={() => startWalkingFor(selected)}
                    disabled={!selfId}
                    className="bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 transition"
                  >
                    <Footprints size={12} /> 산책 시작
                  </button>
                )}
              </div>

              <div className="flex gap-3 mt-3">
                <a
                  href={`/route?from=walk&name=${encodeURIComponent(selected.name)}&lat=${selected.lat}&lng=${selected.lng}${selected.address ? `&addr=${encodeURIComponent(selected.address)}` : ''}`}
                  className="bg-[#3a7ab8] hover:bg-[#1a2a3f] text-white font-bold text-sm px-4 py-1.5 rounded-full flex items-center gap-1 transition"
                >
                  <Navigation size={13} />앱에서 길찾기
                </a>
                {selected.link && (
                  <a href={selected.link} target="_blank" rel="noopener" className="text-sm text-[#888] hover:text-blue-500 font-medium flex items-center gap-1">
                    <ExternalLink size={13} />카카오맵에서 보기
                  </a>
                )}
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-[#aaa] hover:text-[#444] text-lg font-bold">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
