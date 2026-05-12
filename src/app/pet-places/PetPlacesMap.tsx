'use client'

import { useEffect, useRef, useState } from 'react'
import { Navigation, Phone, ExternalLink, UtensilsCrossed, Coffee, Trees } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

type Category = 'restaurant' | 'cafe' | 'playground'
type Filter = 'all' | Category

interface Place {
  id: string
  name: string
  address: string
  phone?: string
  category: Category
  categoryLabel: string
  lat: number
  lng: number
  distance?: number
  link?: string
  rawCategory?: string
  // Gemini 보강 정보
  petFriendly?: '가능' | '조건부' | '불가' | string
  vaccination?: string
  carrierRequired?: boolean
  diningArea?: string
  sizeLimit?: string
  hasOutdoorPlayground?: boolean
  grassType?: string
  playgroundSize?: string
  sizeSeparation?: boolean
  feeInfo?: string
  hours?: string
  rules?: string[]
  summary?: string
  enriching?: boolean
  discoveredVia?: 'ai'
}

const COLORS: Record<Category, { pin: string; badge: string; emoji: string; label: string }> = {
  restaurant: { pin: '#fdba74', badge: 'bg-orange-100 text-orange-700 border-orange-200', emoji: '🍽️', label: '식당' },
  cafe: { pin: '#c4b5fd', badge: 'bg-purple-100 text-purple-700 border-purple-200', emoji: '☕', label: '카페' },
  playground: { pin: '#93c5fd', badge: 'bg-blue-100 text-blue-700 border-blue-200', emoji: '🐕', label: '운동장' },
}

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function PetPlacesMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const lastSearchCenterRef = useRef<[number, number] | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Place | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [locStatus, setLocStatus] = useState<'idle' | 'locating' | 'success' | 'denied' | 'fallback'>('idle')
  const [locError, setLocError] = useState('')
  const [showResearchBtn, setShowResearchBtn] = useState(false)
  const [enriching, setEnriching] = useState(false)

  const applyEnrichment = (batch: Place[], enrichments: any[]) => {
    const byId = new Map<string, any>()
    batch.forEach((p, i) => {
      if (enrichments[i]) byId.set(p.id, enrichments[i])
    })
    setPlaces(prev => {
      const updated = prev.map(p => {
        const e = byId.get(p.id)
        if (!e) return p
        return {
          ...p,
          petFriendly: e.petFriendly,
          vaccination: e.vaccination,
          carrierRequired: e.carrierRequired,
          diningArea: e.diningArea,
          sizeLimit: e.sizeLimit,
          hasOutdoorPlayground: e.hasOutdoorPlayground,
          grassType: e.grassType,
          playgroundSize: e.playgroundSize,
          sizeSeparation: e.sizeSeparation,
          feeInfo: e.feeInfo,
          hours: e.hours,
          rules: Array.isArray(e.rules) ? e.rules : [],
          summary: e.summary,
          enriching: false,
        }
      })
      // petFriendly === '불가' 항목 제거 (펫 키워드가 이름/카테고리에 있으면 보호)
      const PET_KEYWORDS = /애견|반려|강아지|도그|펫|dog|pet/i
      const filtered = updated.filter(p => {
        if (p.petFriendly !== '불가') return true
        const text = `${p.name} ${p.rawCategory || ''}`
        if (PET_KEYWORDS.test(text)) return true
        return false
      })
      // 지도 마커 갱신 (사용자가 직접 변경한 줌은 유지)
      if (mapInstanceRef.current && lastSearchCenterRef.current) {
        renderMarkers(filtered, lastSearchCenterRef.current[0], lastSearchCenterRef.current[1], true)
      }
      return filtered
    })
    setSelected(prev => {
      if (!prev) return prev
      const e = byId.get(prev.id)
      if (!e) return prev
      // 불가 판정 시 선택 해제
      if (e.petFriendly === '불가') return null
      return {
        ...prev,
        petFriendly: e.petFriendly,
        vaccination: e.vaccination,
        carrierRequired: e.carrierRequired,
        diningArea: e.diningArea,
        sizeLimit: e.sizeLimit,
        hasOutdoorPlayground: e.hasOutdoorPlayground,
        grassType: e.grassType,
        playgroundSize: e.playgroundSize,
        sizeSeparation: e.sizeSeparation,
        feeInfo: e.feeInfo,
        hours: e.hours,
        rules: Array.isArray(e.rules) ? e.rules : [],
        summary: e.summary,
      }
    })
  }

  const enrichWithGemini = async (items: Place[]) => {
    if (items.length === 0) return
    setEnriching(true)
    try {
      // 작은 배치(4개씩)로 쪼개서 병렬 호출 - 결과가 들어오는 대로 즉시 UI 반영
      const BATCH_SIZE = 4
      const batches: Place[][] = []
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        batches.push(items.slice(i, i + BATCH_SIZE))
      }
      await Promise.all(
        batches.map(async batch => {
          try {
            const res = await fetch('/api/gemini/pet-places', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ places: batch }),
            })
            const data = await res.json()
            applyEnrichment(batch, data.enrichments || [])
          } catch {
            // 실패해도 다른 배치는 계속
          }
        })
      )
    } finally {
      setEnriching(false)
    }
  }

  const fetchPlaces = async (lat: number, lng: number, rect?: string) => {
    setLoading(true)
    lastSearchCenterRef.current = [lat, lng]
    setShowResearchBtn(false)
    try {
      const params = rect
        ? `rect=${rect}`
        : `lat=${lat}&lng=${lng}`
      const res = await fetch(`/api/pet-places?${params}`)
      const data = await res.json()
      const items: Place[] = (data.places || []).map((p: Place) => ({ ...p, enriching: true }))
      setPlaces(items)
      // 1단계: 1차 결과 즉시 enrichment 시작 (백그라운드)
      enrichWithGemini(items)
      // 2단계: Gemini가 알고있는 유명 장소 추가 검색 (백그라운드)
      if (!rect && lat && lng) {
        discoverMore(lat, lng, items.map(p => p.id))
      }
      return items
    } finally {
      setLoading(false)
    }
  }

  const discoverMore = async (lat: number, lng: number, existingIds: string[]) => {
    try {
      const res = await fetch('/api/pet-places/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, existingIds }),
      })
      const data = await res.json()
      const additional: Place[] = (data.places || []).map((p: any) => ({ ...p, enriching: true }))
      if (additional.length === 0) return

      setPlaces(prev => {
        // 중복 제거 (id + 정규화된 이름)
        const existing = new Set(prev.map(p => p.id))
        const seenNames = new Set(prev.map(p => p.name.replace(/\s+/g, '').toLowerCase()))
        const newOnes = additional.filter(p => {
          if (existing.has(p.id)) return false
          const key = p.name.replace(/\s+/g, '').toLowerCase()
          if (seenNames.has(key)) return false
          seenNames.add(key)
          return true
        })
        if (newOnes.length === 0) return prev
        const merged = [...prev, ...newOnes].sort(
          (a, b) => (a.distance ?? 999) - (b.distance ?? 999)
        )
        // 새 장소들 백그라운드 enrichment
        enrichWithGemini(newOnes)
        // 새 마커 추가 (사용자 줌 유지)
        if (mapInstanceRef.current && lastSearchCenterRef.current) {
          renderMarkers(merged, lastSearchCenterRef.current[0], lastSearchCenterRef.current[1], true)
        }
        return merged
      })
    } catch (e) {
      console.error('discover error', e)
    }
  }

  const renderMarkers = async (items: Place[], lat: number, lng: number, preserveView: boolean = false) => {
    if (typeof window === 'undefined') return
    const L = (await import('leaflet')).default

    // 기존 마커 제거
    markersRef.current.forEach(m => m.remove())
    markersRef.current.clear()

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current!).setView([lat, lng], 14)
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
      mapInstanceRef.current.invalidateSize()
    }

    // 내 위치 마커 (실제 GPS)
    const myLat = userPos?.[0] ?? lat
    const myLng = userPos?.[1] ?? lng
    const myIcon = L.divIcon({
      html: `<div style="background:#3b82f6;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.2)"></div>`,
      className: '', iconAnchor: [9, 9],
    })
    const myMarker = L.marker([myLat, myLng], { icon: myIcon })
      .addTo(mapInstanceRef.current)
      .bindPopup('📍 현재 위치')
    markersRef.current.set('__user', myMarker)

    // 장소 마커 (카테고리별 색상)
    items.forEach((p) => {
      const color = COLORS[p.category].pin
      const emoji = COLORS[p.category].emoji
      const icon = L.divIcon({
        html: `<div style="position:relative;width:36px;height:42px;cursor:pointer">
          <div style="background:${color};color:white;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);position:absolute;top:0;left:0;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
            <span style="transform:rotate(45deg);font-size:14px">${emoji}</span>
          </div>
        </div>`,
        className: '', iconAnchor: [18, 42],
      })
      const marker = L.marker([p.lat, p.lng], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>${p.name}</b><br/>${p.address ?? ''}${p.phone ? `<br/>📞 ${p.phone}` : ''}`)
      marker.on('click', () => setSelected(p))
      markersRef.current.set(p.id, marker)
    })

    // 자동 줌 - 초기 렌더링 시에만
    if (!preserveView && items.length > 0) {
      const bounds = L.latLngBounds([[lat, lng], ...items.map(p => [p.lat, p.lng] as [number, number])])
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
    }
  }

  const filterMarkers = async () => {
    if (typeof window === 'undefined') return
    const L = (await import('leaflet')).default
    markersRef.current.forEach((marker, id) => {
      if (id === '__user') return
      const place = places.find(p => p.id === id)
      if (!place) return
      const shouldShow = filter === 'all' || place.category === filter
      if (shouldShow) {
        if (!mapInstanceRef.current.hasLayer(marker)) marker.addTo(mapInstanceRef.current)
      } else {
        if (mapInstanceRef.current.hasLayer(marker)) marker.remove()
      }
    })
  }

  useEffect(() => {
    if (mapInstanceRef.current) filterMarkers()
  }, [filter, places])

  const locate = () => {
    if (!navigator.geolocation) {
      setLocStatus('fallback')
      setLocError('이 브라우저는 위치 정보를 지원하지 않습니다.')
      const lat = 37.5665, lng = 126.978
      setUserPos([lat, lng])
      fetchPlaces(lat, lng).then(items => renderMarkers(items, lat, lng))
      return
    }
    setLoading(true)
    setLocStatus('locating')
    setLocError('')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords
        setUserPos([lat, lng])
        setLocStatus('success')
        const items = await fetchPlaces(lat, lng)
        await renderMarkers(items, lat, lng)
      },
      (err) => {
        setLocStatus(err.code === 1 ? 'denied' : 'fallback')
        setLocError(
          err.code === 1
            ? '위치 권한이 거부되었습니다. 주소창 좌측 자물쇠 아이콘에서 허용해주세요.'
            : err.code === 2
            ? '위치를 가져올 수 없습니다.'
            : '위치 요청 시간이 초과되었습니다.'
        )
        const lat = 37.5665, lng = 126.978
        setUserPos([lat, lng])
        fetchPlaces(lat, lng).then(items => renderMarkers(items, lat, lng))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    locate()
    return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null }
  }, [])

  const filtered = filter === 'all' ? places : places.filter(p => p.category === filter)
  const counts = {
    all: places.length,
    restaurant: places.filter(p => p.category === 'restaurant').length,
    cafe: places.filter(p => p.category === 'cafe').length,
    playground: places.filter(p => p.category === 'playground').length,
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 위치 상태 */}
      {locStatus === 'locating' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-xs text-blue-700">
          📍 현재 위치를 확인하는 중...
        </div>
      )}
      {locStatus === 'success' && userPos && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-xs text-green-700 flex items-center justify-between">
          <span>✅ 현재 위치 기준 반경 20km 내 애견 동반 장소</span>
          <button onClick={locate} className="text-green-700 hover:underline font-bold">새로고침</button>
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

      {/* AI 분석 진행 표시 */}
      {enriching && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-2 text-xs text-purple-700 flex items-center gap-2">
          <span className="inline-block w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          AI가 각 장소의 규정 정보를 분석 중입니다...
        </div>
      )}

      {/* 카테고리 필터 탭 */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition border ${
            filter === 'all'
              ? 'bg-[#2a3a55] text-white border-[#2a3a55]'
              : 'bg-white text-[#666] border-[#d6e6ff] hover:border-[#2a3a55]'
          }`}
        >
          전체 <span className="text-xs opacity-80">({counts.all})</span>
        </button>
        <button
          onClick={() => setFilter('restaurant')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition border ${
            filter === 'restaurant'
              ? 'bg-orange-300 text-white border-orange-300'
              : 'bg-white text-[#666] border-[#d6e6ff] hover:border-orange-300'
          }`}
        >
          <UtensilsCrossed size={14} />식당 <span className="text-xs opacity-80">({counts.restaurant})</span>
        </button>
        <button
          onClick={() => setFilter('cafe')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition border ${
            filter === 'cafe'
              ? 'bg-purple-300 text-white border-purple-300'
              : 'bg-white text-[#666] border-[#d6e6ff] hover:border-purple-300'
          }`}
        >
          <Coffee size={14} />카페 <span className="text-xs opacity-80">({counts.cafe})</span>
        </button>
        <button
          onClick={() => setFilter('playground')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition border ${
            filter === 'playground'
              ? 'bg-blue-300 text-white border-blue-300'
              : 'bg-white text-[#666] border-[#d6e6ff] hover:border-blue-300'
          }`}
        >
          <Trees size={14} />운동장 <span className="text-xs opacity-80">({counts.playground})</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* 지도 */}
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
                fetchPlaces(c.lat, c.lng, rect).then(items => renderMarkers(items, c.lat, c.lng))
              }}
              disabled={loading}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-[#3a7ab8] hover:bg-[#1a2a3f] text-white font-bold text-sm px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 disabled:opacity-70"
            >
              <Navigation size={14} />
              이 지역에서 다시 검색
            </button>
          )}
        </div>

        {/* 장소 목록 */}
        <div className="lg:w-2/5 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '550px' }}>
          <p className="text-xs text-[#aaa] px-1 pb-1">총 {filtered.length}개의 장소</p>
          {loading && filtered.length === 0 && (
            <div className="text-center py-10 text-[#aaa] text-sm">
              <div className="text-3xl mb-2 animate-bounce">🐾</div>
              검색 중...
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-10 text-[#aaa] text-sm">근처에 등록된 장소가 없습니다.</div>
          )}
          {filtered.map((p) => {
            const isSelected = selected?.id === p.id
            const info = COLORS[p.category]
            return (
              <div
                key={p.id}
                onClick={() => {
                  setSelected(p)
                  mapInstanceRef.current?.setView([p.lat, p.lng], 16)
                  markersRef.current.get(p.id)?.openPopup()
                }}
                className={`bg-white rounded-xl p-3 border cursor-pointer transition-colors ${isSelected ? 'border-[#3a7ab8] shadow-md' : 'border-[#d6e6ff] hover:border-[#3a7ab8]'}`}
              >
                <div className="flex items-start gap-2">
                  <div className="text-xl flex-shrink-0">{info.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[#2a3a55] truncate flex-1">{p.name}</p>
                      {p.distance !== undefined && (
                        <span className="text-xs text-[#3a7ab8] font-medium flex-shrink-0">
                          {p.distance < 1 ? `${Math.round(p.distance * 1000)}m` : `${p.distance.toFixed(1)}km`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${info.badge}`}>
                        {info.label}
                      </span>
                      {p.discoveredVia === 'ai' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium border bg-pink-50 text-pink-700 border-pink-200">
                          ✨ AI 추천
                        </span>
                      )}
                      {p.petFriendly === '조건부' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium border bg-yellow-50 text-yellow-700 border-yellow-200">
                          ⚠️ 조건부 동반
                        </span>
                      )}
                      {p.hasOutdoorPlayground && p.category !== 'playground' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium border bg-green-50 text-green-700 border-green-200">
                          🌳 야외 운동장
                        </span>
                      )}
                      {p.category === 'playground' && p.grassType && p.grassType !== '해당없음' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium border bg-green-50 text-green-700 border-green-200">
                          🌱 {p.grassType}
                        </span>
                      )}
                      {p.vaccination === '필수' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium border bg-red-50 text-red-700 border-red-200">
                          💉 접종 필수
                        </span>
                      )}
                      {p.diningArea === '외부석만' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium border bg-amber-50 text-amber-700 border-amber-200">
                          🌤 외부석만
                        </span>
                      )}
                    </div>
                    {p.address && <p className="text-xs text-[#888] truncate mt-1">{p.address}</p>}
                    {p.summary && (
                      <p className="text-xs text-[#444] mt-1 italic line-clamp-2">💡 {p.summary}</p>
                    )}
                    {p.enriching && !p.summary && (
                      <p className="text-xs text-[#bbb] italic mt-1">AI 규정 분석 중...</p>
                    )}
                    {p.phone && (
                      <p className="text-xs text-[#aaa] flex items-center gap-1 mt-1">
                        <Phone size={10} />{p.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 선택된 장소 상세 */}
      {selected && (
        <div className="bg-[#f5f7e8] border border-[#3a7ab8] rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-[#2a3a55]">{COLORS[selected.category].emoji} {selected.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${COLORS[selected.category].badge}`}>
                  {COLORS[selected.category].label}
                </span>
              </div>
              {selected.rawCategory && <p className="text-xs text-[#aaa] mt-0.5">{selected.rawCategory}</p>}
              {selected.address && <p className="text-sm text-[#666] mt-1">{selected.address}</p>}

              {/* AI 분석 규정 정보 */}
              {selected.summary && (
                <div className="mt-3 bg-white rounded-lg border border-[#fde68a] p-3">
                  <p className="text-xs font-bold text-[#3a7ab8] mb-2">💡 AI 분석 정보</p>
                  <p className="text-sm text-[#444] mb-2">{selected.summary}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    {selected.vaccination && (
                      <div className="flex items-center gap-1">
                        <span className="text-[#aaa]">💉 접종증:</span>
                        <span className="font-medium text-[#2a3a55]">{selected.vaccination}</span>
                      </div>
                    )}
                    {selected.carrierRequired !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="text-[#aaa]">🎒 이동가방:</span>
                        <span className="font-medium text-[#2a3a55]">
                          {selected.carrierRequired ? '필수' : '불필요'}
                        </span>
                      </div>
                    )}
                    {selected.diningArea && selected.diningArea !== '해당없음' && (
                      <div className="flex items-center gap-1">
                        <span className="text-[#aaa]">🪑 동반 구역:</span>
                        <span className="font-medium text-[#2a3a55]">{selected.diningArea}</span>
                      </div>
                    )}
                    {selected.sizeLimit && (
                      <div className="flex items-center gap-1">
                        <span className="text-[#aaa]">🐕 크기 제한:</span>
                        <span className="font-medium text-[#2a3a55]">{selected.sizeLimit}</span>
                      </div>
                    )}
                    {selected.hasOutdoorPlayground && selected.category !== 'playground' && (
                      <div className="flex items-center gap-1 col-span-2">
                        <span className="text-[#aaa]">🌳 야외 운동장:</span>
                        <span className="font-medium text-green-700">있을 가능성 높음</span>
                      </div>
                    )}
                    {selected.grassType && selected.grassType !== '해당없음' && (
                      <div className="flex items-center gap-1">
                        <span className="text-[#aaa]">🌱 잔디:</span>
                        <span className="font-medium text-[#2a3a55]">{selected.grassType}</span>
                      </div>
                    )}
                    {selected.playgroundSize && selected.playgroundSize !== '해당없음' && (
                      <div className="flex items-center gap-1">
                        <span className="text-[#aaa]">📐 운동장 크기:</span>
                        <span className="font-medium text-[#2a3a55]">{selected.playgroundSize}</span>
                      </div>
                    )}
                    {selected.sizeSeparation !== undefined && selected.category === 'playground' && (
                      <div className="flex items-center gap-1">
                        <span className="text-[#aaa]">🔀 대소형견 분리:</span>
                        <span className="font-medium text-[#2a3a55]">
                          {selected.sizeSeparation ? '있음' : '없음'}
                        </span>
                      </div>
                    )}
                    {selected.feeInfo && selected.feeInfo !== '해당없음' && (
                      <div className="flex items-center gap-1">
                        <span className="text-[#aaa]">💰 이용료:</span>
                        <span className="font-medium text-[#2a3a55]">{selected.feeInfo}</span>
                      </div>
                    )}
                    {selected.hours && (
                      <div className="flex items-center gap-1">
                        <span className="text-[#aaa]">🕐 운영시간:</span>
                        <span className="font-medium text-[#2a3a55]">{selected.hours}</span>
                      </div>
                    )}
                  </div>

                  {selected.rules && selected.rules.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[#fde68a]">
                      <p className="text-xs font-bold text-[#3a7ab8] mb-1">📋 규정·안내</p>
                      <ul className="text-xs text-[#444] space-y-0.5">
                        {selected.rules.map((r, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-[#aaa]">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-[10px] text-[#aaa] mt-2 italic">
                    * AI 추정 정보이므로 방문 전 전화로 확인하세요.
                  </p>
                </div>
              )}
              {!selected.summary && selected.enriching && (
                <div className="mt-3 bg-white rounded-lg border border-[#d6e6ff] p-3">
                  <p className="text-xs text-[#aaa] italic flex items-center gap-2">
                    <span className="inline-block w-3 h-3 border-2 border-[#3a7ab8] border-t-transparent rounded-full animate-spin" />
                    AI가 규정 정보를 분석 중입니다...
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-3 mt-3 items-center">
                <a
                  href={`/route?from=pet-places&name=${encodeURIComponent(selected.name)}&lat=${selected.lat}&lng=${selected.lng}${selected.address ? `&addr=${encodeURIComponent(selected.address)}` : ''}`}
                  className="bg-[#3a7ab8] hover:bg-[#1a2a3f] text-white font-bold text-sm px-4 py-1.5 rounded-full flex items-center gap-1 transition"
                >
                  <Navigation size={13} />앱에서 길찾기
                </a>
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="text-sm text-[#3a7ab8] font-bold flex items-center gap-1">
                    <Phone size={13} />{selected.phone}
                  </a>
                )}
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
