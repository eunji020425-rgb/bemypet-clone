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
      const items: Place[] = data.places || []
      setPlaces(items)
      return items
    } finally {
      setLoading(false)
    }
  }

  const renderMarkers = async (items: Place[], lat: number, lng: number) => {
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

    // 자동 줌
    if (items.length > 0) {
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

      {/* 카테고리 필터 탭 */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition border ${
            filter === 'all'
              ? 'bg-[#2d2d2d] text-white border-[#2d2d2d]'
              : 'bg-white text-[#666] border-[#ececec] hover:border-[#2d2d2d]'
          }`}
        >
          전체 <span className="text-xs opacity-80">({counts.all})</span>
        </button>
        <button
          onClick={() => setFilter('restaurant')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition border ${
            filter === 'restaurant'
              ? 'bg-orange-300 text-white border-orange-300'
              : 'bg-white text-[#666] border-[#ececec] hover:border-orange-300'
          }`}
        >
          <UtensilsCrossed size={14} />식당 <span className="text-xs opacity-80">({counts.restaurant})</span>
        </button>
        <button
          onClick={() => setFilter('cafe')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition border ${
            filter === 'cafe'
              ? 'bg-purple-300 text-white border-purple-300'
              : 'bg-white text-[#666] border-[#ececec] hover:border-purple-300'
          }`}
        >
          <Coffee size={14} />카페 <span className="text-xs opacity-80">({counts.cafe})</span>
        </button>
        <button
          onClick={() => setFilter('playground')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition border ${
            filter === 'playground'
              ? 'bg-blue-300 text-white border-blue-300'
              : 'bg-white text-[#666] border-[#ececec] hover:border-blue-300'
          }`}
        >
          <Trees size={14} />운동장 <span className="text-xs opacity-80">({counts.playground})</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* 지도 */}
        <div className="lg:w-3/5 relative">
          <div ref={mapRef} className="w-full rounded-2xl overflow-hidden border border-[#ececec]" style={{ height: '550px' }} />
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
              className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-[#f5c518] hover:bg-[#e0b010] text-white font-bold text-sm px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 disabled:opacity-70"
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
                className={`bg-white rounded-xl p-3 border cursor-pointer transition-colors ${isSelected ? 'border-[#f5c518] shadow-md' : 'border-[#ececec] hover:border-[#f5c518]'}`}
              >
                <div className="flex items-start gap-2">
                  <div className="text-xl flex-shrink-0">{info.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[#2d2d2d] truncate flex-1">{p.name}</p>
                      {p.distance !== undefined && (
                        <span className="text-xs text-[#f5c518] font-medium flex-shrink-0">
                          {p.distance < 1 ? `${Math.round(p.distance * 1000)}m` : `${p.distance.toFixed(1)}km`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${info.badge}`}>
                        {info.label}
                      </span>
                      {p.address && <span className="text-xs text-[#888] truncate">{p.address}</span>}
                    </div>
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
        <div className="bg-[#fffbee] border border-[#f5c518] rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-[#2d2d2d]">{COLORS[selected.category].emoji} {selected.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${COLORS[selected.category].badge}`}>
                  {COLORS[selected.category].label}
                </span>
              </div>
              {selected.rawCategory && <p className="text-xs text-[#aaa] mt-0.5">{selected.rawCategory}</p>}
              {selected.address && <p className="text-sm text-[#666] mt-1">{selected.address}</p>}
              <div className="flex flex-wrap gap-3 mt-3 items-center">
                <a
                  href={`/route?from=pet-places&name=${encodeURIComponent(selected.name)}&lat=${selected.lat}&lng=${selected.lng}${selected.address ? `&addr=${encodeURIComponent(selected.address)}` : ''}`}
                  className="bg-[#f5c518] hover:bg-[#e0b010] text-white font-bold text-sm px-4 py-1.5 rounded-full flex items-center gap-1 transition"
                >
                  <Navigation size={13} />앱에서 길찾기
                </a>
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="text-sm text-[#f5c518] font-bold flex items-center gap-1">
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
