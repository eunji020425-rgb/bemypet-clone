'use client'

import { useEffect, useRef, useState } from 'react'
import { Phone, Navigation, ExternalLink } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

interface Hospital {
  id: string
  name: string
  address: string
  phone?: string
  lat: number
  lng: number
  distance?: number
  link?: string
  category?: string
}

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function HospitalMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Hospital | null>(null)
  const [locStatus, setLocStatus] = useState<'idle' | 'locating' | 'success' | 'denied' | 'fallback'>('idle')
  const [locError, setLocError] = useState('')
  const [searchRadius, setSearchRadius] = useState(5000)
  const [showResearchBtn, setShowResearchBtn] = useState(false)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const lastSearchCenterRef = useRef<[number, number] | null>(null)

  const fetchHospitals = async (lat: number, lng: number, rect?: string) => {
    setLoading(true)
    lastSearchCenterRef.current = [lat, lng]
    setShowResearchBtn(false)
    try {
      const allItems: Hospital[] = []
      const seenIds = new Set<string>()

      for (let page = 1; page <= 3; page++) {
        const params = rect
          ? `query=동물병원&rect=${rect}&page=${page}`
          : `query=동물병원&lat=${lat}&lng=${lng}&radius=20000&page=${page}`
        const res = await fetch(`/api/hospitals?${params}`)
        const data = await res.json()
        const items: Hospital[] = data.items || []
        if (items.length === 0) break
        for (const h of items) {
          if (seenIds.has(h.id)) continue
          seenIds.add(h.id)
          allItems.push(h)
        }
        if (data.isEnd || items.length < 15) break
      }
      setSearchRadius(20000)
      setHospitals(allItems)
      return allItems
    } finally {
      setLoading(false)
    }
  }

  const initMap = async (lat: number, lng: number, items: Hospital[]) => {
    if (typeof window === 'undefined') return
    const L = (await import('leaflet')).default

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current!).setView([lat, lng], 14)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(mapInstanceRef.current)
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100)
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 500)

      // 지도 이동 감지: 마지막 검색 위치에서 1km 이상 멀어지면 재검색 버튼 표시
      mapInstanceRef.current.on('moveend', () => {
        const center = mapInstanceRef.current.getCenter()
        const last = lastSearchCenterRef.current
        if (!last) return
        const dist = calcDistance(last[0], last[1], center.lat, center.lng)
        setShowResearchBtn(dist > 1)
      })
    } else {
      mapInstanceRef.current.setView([lat, lng], 14)
      mapInstanceRef.current.invalidateSize()
    }

    // 내 위치 마커는 항상 실제 GPS 좌표(userPos) 사용
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

    // 병원 핀
    items.forEach((h, i) => {
      const icon = L.divIcon({
        html: `<div style="position:relative;width:36px;height:42px;cursor:pointer">
          <div style="background:#fca5a5;color:white;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);position:absolute;top:0;left:0;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
            <span style="transform:rotate(45deg);font-size:11px;font-weight:bold;color:white">${i + 1}</span>
          </div>
        </div>`,
        className: '', iconAnchor: [18, 42],
      })
      const marker = L.marker([h.lat, h.lng], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>${h.name}</b><br/>${h.address ?? ''}${h.phone ? `<br/>📞 ${h.phone}` : ''}`)
      marker.on('click', () => setSelected(h))
      markersRef.current.push(marker)
    })

    // 자동 줌: 검색 중심 + 병원들만 포함 (드래그 검색 시 GPS 위치까지 강제로 포함하지 않음)
    if (items.length > 0) {
      const bounds = L.latLngBounds([[lat, lng], ...items.map(h => [h.lat, h.lng] as [number, number])])
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
    }
  }

  const locate = () => {
    if (!navigator.geolocation) {
      setLocStatus('fallback')
      setLocError('이 브라우저는 위치 정보를 지원하지 않습니다.')
      const lat = 37.5665, lng = 126.978
      setUserPos([lat, lng])
      fetchHospitals(lat, lng).then(items => initMap(lat, lng, items))
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
        const items = await fetchHospitals(lat, lng)
        await initMap(lat, lng, items)
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
        fetchHospitals(lat, lng).then(items => initMap(lat, lng, items))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    locate()
    return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null }
  }, [])

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
          <span>✅ 현재 위치 기준 반경 {(searchRadius/1000).toFixed(0)}km 내 동물병원</span>
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

      <div className="flex flex-col gap-4">
        {/* 지도 */}
        <div className="relative">
          <div ref={mapRef} className="w-full rounded-2xl overflow-hidden border border-[#d6e6ff]" style={{ height: '320px' }} />
          {showResearchBtn && (
            <button
              onClick={() => {
                const map = mapInstanceRef.current
                const c = map.getCenter()
                const b = map.getBounds()
                const sw = b.getSouthWest()
                const ne = b.getNorthEast()
                const rect = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`
                fetchHospitals(c.lat, c.lng, rect).then(items => initMap(c.lat, c.lng, items))
              }}
              disabled={loading}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-[#3a7ab8] hover:bg-[#1a2a3f] text-white font-bold text-sm px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 disabled:opacity-70"
            >
              <Navigation size={14} />
              이 지역에서 다시 검색
            </button>
          )}
        </div>

        {/* 병원 목록 */}
        <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '420px' }}>
          <p className="text-xs text-[#aaa] px-1 pb-1">총 {hospitals.length}개의 동물병원</p>
          {loading && hospitals.length === 0 && (
            <div className="text-center py-10 text-[#aaa] text-sm">
              <div className="text-3xl mb-2 animate-bounce">🐾</div>
              위치 기반 검색 중...
            </div>
          )}
          {!loading && hospitals.length === 0 && (
            <div className="text-center py-10 text-[#aaa] text-sm">근처에 등록된 동물병원이 없습니다.</div>
          )}
          {hospitals.map((h, i) => {
            const isSelected = selected?.id === h.id
            return (
              <div
                key={h.id}
                onClick={() => {
                  setSelected(h)
                  mapInstanceRef.current?.setView([h.lat, h.lng], 16)
                  markersRef.current[i + 1]?.openPopup()
                }}
                className={`bg-white rounded-xl p-3 border cursor-pointer transition-colors ${isSelected ? 'border-[#3a7ab8] shadow-md' : 'border-[#d6e6ff] hover:border-[#3a7ab8]'}`}
              >
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-red-300 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#2a3a55] truncate">{h.name}</p>
                      {h.distance !== undefined && (
                        <span className="text-xs text-[#3a7ab8] font-medium flex-shrink-0">
                          {h.distance < 1 ? `${Math.round(h.distance * 1000)}m` : `${h.distance.toFixed(1)}km`}
                        </span>
                      )}
                    </div>
                    {h.address && <p className="text-xs text-[#888] truncate mt-0.5">{h.address}</p>}
                    {h.phone && (
                      <p className="text-xs text-[#aaa] flex items-center gap-1 mt-1">
                        <Phone size={10} />{h.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 선택 병원 상세 */}
      {selected && (
        <div className="bg-[#f5f7e8] border border-[#3a7ab8] rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-bold text-[#2a3a55]">🐾 {selected.name}</h3>
              {selected.category && <p className="text-xs text-[#aaa] mt-0.5">{selected.category}</p>}
              {selected.address && <p className="text-sm text-[#666] mt-1">{selected.address}</p>}
              <div className="flex flex-wrap gap-3 mt-3 items-center">
                <a
                  href={`/route?from=hospital&name=${encodeURIComponent(selected.name)}&lat=${selected.lat}&lng=${selected.lng}${selected.address ? `&addr=${encodeURIComponent(selected.address)}` : ''}`}
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
