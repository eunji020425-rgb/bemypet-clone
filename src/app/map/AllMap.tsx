'use client'

import { useEffect, useRef, useState } from 'react'
import { Navigation, Phone, ExternalLink, Hospital, UtensilsCrossed, Coffee, Trees, Footprints } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

type Category = 'hospital' | 'restaurant' | 'cafe' | 'playground' | 'walk'

interface Item {
  id: string
  name: string
  address: string
  phone?: string
  category: Category
  lat: number
  lng: number
  distance?: number
  link?: string
  rawCategory?: string
}

const STYLES: Record<Category, { pin: string; badge: string; emoji: string; label: string; icon: any }> = {
  hospital:   { pin: '#fca5a5', badge: 'bg-red-100 text-red-700 border-red-200',         emoji: '🏥', label: '동물병원', icon: Hospital },
  restaurant: { pin: '#fdba74', badge: 'bg-orange-100 text-orange-700 border-orange-200', emoji: '🍽️', label: '식당',     icon: UtensilsCrossed },
  cafe:       { pin: '#c4b5fd', badge: 'bg-purple-100 text-purple-700 border-purple-200', emoji: '☕', label: '카페',     icon: Coffee },
  playground: { pin: '#93c5fd', badge: 'bg-blue-100 text-blue-700 border-blue-200',       emoji: '🐕', label: '운동장',   icon: Trees },
  walk:       { pin: '#86efac', badge: 'bg-green-100 text-green-700 border-green-200',    emoji: '🌳', label: '산책로',   icon: Footprints },
}

const ALL_CATEGORIES: Category[] = ['hospital', 'restaurant', 'cafe', 'playground', 'walk']

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function AllMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const lastSearchCenterRef = useRef<[number, number] | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Item | null>(null)
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [locStatus, setLocStatus] = useState<'idle' | 'locating' | 'success' | 'denied' | 'fallback'>('idle')
  const [locError, setLocError] = useState('')
  const [showResearchBtn, setShowResearchBtn] = useState(false)

  const fetchAll = async (lat: number, lng: number, rect?: string) => {
    setLoading(true)
    lastSearchCenterRef.current = [lat, lng]
    setShowResearchBtn(false)
    try {
      // 병원/장소/산책로를 병렬 호출
      const baseParams = rect ? `rect=${rect}` : `lat=${lat}&lng=${lng}`
      const [hospitalsRes, placesRes, walksRes] = await Promise.all([
        fetchHospitals(lat, lng, rect),
        fetch(`/api/pet-places?${baseParams}`).then(r => r.json()).catch(() => ({})),
        fetch(`/api/walks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng, rect }),
        }).then(r => r.json()).catch(() => ({})),
      ])

      const combined: Item[] = []

      for (const h of hospitalsRes) {
        combined.push({
          id: h.id,
          name: h.name,
          address: h.address,
          phone: h.phone,
          category: 'hospital',
          lat: h.lat,
          lng: h.lng,
          distance: h.distance,
          link: h.link,
          rawCategory: h.category,
        })
      }
      for (const p of (placesRes.places || [])) {
        combined.push({
          id: p.id,
          name: p.name,
          address: p.address,
          phone: p.phone,
          category: p.category,
          lat: p.lat,
          lng: p.lng,
          distance: p.distance,
          link: p.link,
          rawCategory: p.rawCategory,
        })
      }
      for (const w of (walksRes.parks || [])) {
        combined.push({
          id: `walk-${w.id}`,
          name: w.name,
          address: w.address,
          category: 'walk',
          lat: w.lat,
          lng: w.lng,
          distance: w.distance,
          link: w.link,
          rawCategory: w.category,
        })
      }

      combined.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))
      setItems(combined)
      return combined
    } finally {
      setLoading(false)
    }
  }

  const fetchHospitals = async (lat: number, lng: number, rect?: string) => {
    const all: any[] = []
    for (let page = 1; page <= 2; page++) {
      const params = rect
        ? `query=동물병원&rect=${rect}&page=${page}`
        : `query=동물병원&lat=${lat}&lng=${lng}&radius=20000&page=${page}`
      const res = await fetch(`/api/hospitals?${params}`).then(r => r.json()).catch(() => ({ items: [] }))
      const items = res.items || []
      all.push(...items)
      if (res.isEnd || items.length < 15) break
    }
    return all
  }

  const renderMarkers = async (lat: number, lng: number, all: Item[]) => {
    if (typeof window === 'undefined') return
    const L = (await import('leaflet')).default

    markersRef.current.forEach(m => m.remove())
    markersRef.current.clear()

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
      mapInstanceRef.current.invalidateSize()
    }

    // 내 위치
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

    // 항목 마커
    all.forEach((it) => {
      const style = STYLES[it.category]
      if (!style) return
      const icon = L.divIcon({
        html: `<div style="position:relative;width:32px;height:38px;cursor:pointer">
          <div style="background:${style.pin};color:white;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);position:absolute;top:0;left:0;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
            <span style="transform:rotate(45deg);font-size:12px">${style.emoji}</span>
          </div>
        </div>`,
        className: '', iconAnchor: [16, 38],
      })
      const marker = L.marker([it.lat, it.lng], { icon })
        .bindPopup(`<b>${it.name}</b><br/>${it.address ?? ''}`)
      marker.on('click', () => setSelected(it))
      markersRef.current.set(it.id, marker)
      // 필터에 포함된 카테고리만 즉시 추가
      if (filter === 'all' || filter === it.category) marker.addTo(mapInstanceRef.current)
    })

    // 자동 줌
    const visibleItems = all.filter(it => filter === 'all' || filter === it.category)
    if (visibleItems.length > 0) {
      const bounds = L.latLngBounds([[lat, lng], ...visibleItems.map(it => [it.lat, it.lng] as [number, number])])
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }
  }

  // 필터 변경 시 마커 표시/숨김
  useEffect(() => {
    if (!mapInstanceRef.current) return
    markersRef.current.forEach((marker, id) => {
      if (id === '__user') return
      const item = items.find(it => it.id === id)
      if (!item) return
      const show = filter === 'all' || filter === item.category
      if (show) {
        if (!mapInstanceRef.current.hasLayer(marker)) marker.addTo(mapInstanceRef.current)
      } else {
        if (mapInstanceRef.current.hasLayer(marker)) marker.remove()
      }
    })
  }, [filter, items])

  const locate = () => {
    if (!navigator.geolocation) {
      setLocStatus('fallback')
      setLocError('이 브라우저는 위치 정보를 지원하지 않습니다.')
      const lat = 37.5665, lng = 126.978
      setUserPos([lat, lng])
      fetchAll(lat, lng).then(all => renderMarkers(lat, lng, all))
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
        const all = await fetchAll(lat, lng)
        await renderMarkers(lat, lng, all)
      },
      (err) => {
        setLocStatus(err.code === 1 ? 'denied' : 'fallback')
        setLocError(
          err.code === 1
            ? '위치 권한이 거부되었습니다. 주소창 좌측 자물쇠 아이콘에서 허용해주세요.'
            : '위치를 가져올 수 없습니다.'
        )
        const lat = 37.5665, lng = 126.978
        setUserPos([lat, lng])
        fetchAll(lat, lng).then(all => renderMarkers(lat, lng, all))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    locate()
    return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null }
  }, [])

  const filtered = filter === 'all' ? items : items.filter(it => it.category === filter)
  const counts: Record<Category, number> = {
    hospital: items.filter(it => it.category === 'hospital').length,
    restaurant: items.filter(it => it.category === 'restaurant').length,
    cafe: items.filter(it => it.category === 'cafe').length,
    playground: items.filter(it => it.category === 'playground').length,
    walk: items.filter(it => it.category === 'walk').length,
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 위치 상태 */}
      {locStatus === 'locating' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-xs text-blue-700">
          📍 현재 위치를 확인하는 중...
        </div>
      )}
      {locStatus === 'success' && userPos && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-xs text-green-700 flex items-center justify-between">
          <span>✅ 현재 위치 기준 통합 검색 (총 {items.length}곳)</span>
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

      {/* 카테고리 필터 (단일 선택) */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition border ${
            filter === 'all'
              ? 'bg-[#2d2d2d] text-white border-[#2d2d2d]'
              : 'bg-white text-[#666] border-[#ececec] hover:border-[#2d2d2d]'
          }`}
        >
          전체 <span className="text-xs opacity-80">({items.length})</span>
        </button>
        {ALL_CATEGORIES.map(cat => {
          const style = STYLES[cat]
          const Icon = style.icon
          const active = filter === cat
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={active ? { backgroundColor: style.pin, borderColor: style.pin } : {}}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition border ${
                active ? 'text-white' : 'bg-white text-[#666] border-[#ececec] hover:border-[#aaa]'
              }`}
            >
              <Icon size={14} />
              {style.label}
              <span className="text-xs opacity-80">({counts[cat]})</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* 지도 */}
        <div className="lg:w-3/5 relative">
          <div ref={mapRef} className="w-full rounded-2xl overflow-hidden border border-[#ececec]" style={{ height: '600px' }} />
          {showResearchBtn && (
            <button
              onClick={() => {
                const map = mapInstanceRef.current
                const c = map.getCenter()
                const b = map.getBounds()
                const sw = b.getSouthWest()
                const ne = b.getNorthEast()
                const rect = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`
                fetchAll(c.lat, c.lng, rect).then(all => renderMarkers(c.lat, c.lng, all))
              }}
              disabled={loading}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-[#f5c518] hover:bg-[#e0b010] text-white font-bold text-sm px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 disabled:opacity-70"
            >
              <Navigation size={14} />이 지역에서 다시 검색
            </button>
          )}
        </div>

        {/* 리스트 */}
        <div className="lg:w-2/5 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '600px' }}>
          <p className="text-xs text-[#aaa] px-1 pb-1">{filter === 'all' ? '전체' : STYLES[filter].label} · {filtered.length}곳</p>
          {loading && filtered.length === 0 && (
            <div className="text-center py-10 text-[#aaa] text-sm">
              <div className="text-3xl mb-2 animate-bounce">🐾</div>
              검색 중...
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-10 text-[#aaa] text-sm">검색 결과가 없습니다.</div>
          )}
          {filtered.map((it) => {
            const style = STYLES[it.category]
            const isSelected = selected?.id === it.id
            return (
              <div
                key={it.id}
                onClick={() => {
                  setSelected(it)
                  mapInstanceRef.current?.setView([it.lat, it.lng], 16)
                  markersRef.current.get(it.id)?.openPopup()
                }}
                className={`bg-white rounded-xl p-3 border cursor-pointer transition-colors ${isSelected ? 'border-[#f5c518] shadow-md' : 'border-[#ececec] hover:border-[#f5c518]'}`}
              >
                <div className="flex items-start gap-2">
                  <div className="text-lg flex-shrink-0">{style.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[#2d2d2d] truncate flex-1">{it.name}</p>
                      {it.distance !== undefined && (
                        <span className="text-xs text-[#f5c518] font-medium flex-shrink-0">
                          {it.distance < 1 ? `${Math.round(it.distance * 1000)}m` : `${it.distance.toFixed(1)}km`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${style.badge}`}>
                        {style.label}
                      </span>
                      {it.address && <span className="text-xs text-[#888] truncate">{it.address}</span>}
                    </div>
                    {it.phone && (
                      <p className="text-xs text-[#aaa] flex items-center gap-1 mt-1">
                        <Phone size={10} />{it.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 선택 상세 */}
      {selected && (
        <div className="bg-[#fffbee] border border-[#f5c518] rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-[#2d2d2d]">{STYLES[selected.category].emoji} {selected.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STYLES[selected.category].badge}`}>
                  {STYLES[selected.category].label}
                </span>
              </div>
              {selected.rawCategory && <p className="text-xs text-[#aaa] mt-0.5">{selected.rawCategory}</p>}
              {selected.address && <p className="text-sm text-[#666] mt-1">{selected.address}</p>}
              <div className="flex flex-wrap gap-3 mt-3 items-center">
                <a
                  href={`/route?from=map&name=${encodeURIComponent(selected.name)}&lat=${selected.lat}&lng=${selected.lng}${selected.address ? `&addr=${encodeURIComponent(selected.address)}` : ''}`}
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
