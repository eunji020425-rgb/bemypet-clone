'use client'

import { useEffect, useRef, useState } from 'react'
import { Phone, Search, Navigation, ExternalLink } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

interface Hospital {
  id: string
  name: string
  address: string
  phone?: string
  lat: number
  lng: number
  source: 'osm' | 'naver'
  distance?: number
  link?: string
}

function stripHtml(str: string) {
  return str.replace(/<[^>]+>/g, '')
}

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Overpass API로 위치 기반 동물병원 검색 (반경 단위: m)
async function searchOverpass(lat: number, lng: number, radius: number): Promise<Hospital[]> {
  const query = `[out:json][timeout:25];(node["amenity"="veterinary"](around:${radius},${lat},${lng});way["amenity"="veterinary"](around:${radius},${lat},${lng}););out center;`
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
    })
    const data = await res.json()
    return (data.elements || []).map((el: any) => {
      const elLat = el.lat ?? el.center?.lat
      const elLon = el.lon ?? el.center?.lon
      if (!elLat || !elLon) return null
      const tags = el.tags || {}
      const addrParts = [
        tags['addr:province'], tags['addr:city'], tags['addr:district'],
        tags['addr:street'], tags['addr:housenumber'], tags['addr:full']
      ].filter(Boolean)
      return {
        id: `osm-${el.id}`,
        name: tags.name || tags['name:ko'] || '동물병원',
        address: addrParts.join(' ') || tags['addr:full'] || '',
        phone: tags.phone || tags['contact:phone'],
        lat: elLat,
        lng: elLon,
        source: 'osm' as const,
      }
    }).filter(Boolean) as Hospital[]
  } catch {
    return []
  }
}

// 네이버 검색 보조 (전화번호 등 정보 보강)
async function searchNaver(query: string): Promise<Hospital[]> {
  try {
    const res = await fetch(`/api/hospitals?query=${encodeURIComponent(query)}&display=5`)
    const data = await res.json()
    return (data.items || []).map((it: any, i: number) => {
      const lat = parseInt(it.mapy) / 1e7
      const lng = parseInt(it.mapx) / 1e7
      return {
        id: `naver-${i}-${it.title}`,
        name: stripHtml(it.title),
        address: it.roadAddress || it.address || '',
        phone: it.telephone,
        lat, lng,
        source: 'naver' as const,
        link: it.link,
      }
    }).filter((h: Hospital) => h.lat && h.lng)
  } catch {
    return []
  }
}

// Nominatim 역지오코딩으로 지역명 추출
async function getRegionName(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko&zoom=10`
    )
    const data = await res.json()
    const a = data.address || {}
    // 한글 지역명 우선 (Nominatim이 한글로 안 줄 수도 있어서 fallback)
    return a.city || a.town || a.county || a.borough || a.state || ''
  } catch {
    return ''
  }
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
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  const fetchHospitals = async (lat: number, lng: number) => {
    setLoading(true)
    try {
      // 1차: Overpass API로 위치 반경 검색 (5km → 없으면 20km → 50km로 자동 확장)
      let radius = searchRadius
      let osmResults = await searchOverpass(lat, lng, radius)
      if (osmResults.length === 0) {
        radius = 20000
        osmResults = await searchOverpass(lat, lng, radius)
      }
      if (osmResults.length === 0) {
        radius = 50000
        osmResults = await searchOverpass(lat, lng, radius)
      }
      setSearchRadius(radius)

      // 2차: 네이버 검색으로 보강 (지역명 + 동물병원)
      const region = await getRegionName(lat, lng)
      const naverQuery = region ? `${region} 동물병원` : '동물병원'
      const naverResults = await searchNaver(naverQuery)

      // 병합 + 중복 제거 (이름 기준)
      const seen = new Set<string>()
      const combined: Hospital[] = []
      for (const h of [...osmResults, ...naverResults]) {
        const key = h.name.replace(/\s+/g, '').toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        const dist = calcDistance(lat, lng, h.lat, h.lng)
        if (dist < 100) combined.push({ ...h, distance: dist })
      }
      combined.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))

      setHospitals(combined)
      return combined
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
    } else {
      mapInstanceRef.current.setView([lat, lng], 14)
      mapInstanceRef.current.invalidateSize()
    }

    // 내 위치 마커
    const myIcon = L.divIcon({
      html: `<div style="background:#3b82f6;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.2)"></div>`,
      className: '', iconAnchor: [9, 9],
    })
    const myMarker = L.marker([lat, lng], { icon: myIcon })
      .addTo(mapInstanceRef.current)
      .bindPopup('📍 현재 위치')
    markersRef.current.push(myMarker)

    // 병원 핀 마커
    items.forEach((h, i) => {
      const icon = L.divIcon({
        html: `<div style="background:#ef4444;color:white;min-width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer"><span style="transform:rotate(45deg);font-size:14px;font-weight:bold">🐾</span></div>`,
        className: '', iconAnchor: [16, 32],
      })
      const marker = L.marker([h.lat, h.lng], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>${h.name}</b><br/>${h.address}${h.phone ? `<br/>📞 ${h.phone}` : ''}`)
      marker.on('click', () => setSelected(h))
      markersRef.current.push(marker)
    })

    // 지도 범위를 모든 마커에 맞춤
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
          <span>✅ 현재 위치 기준 검색 중 (반경 {(searchRadius/1000).toFixed(0)}km)</span>
          <button onClick={locate} className="text-green-700 hover:underline font-bold">새로고침</button>
        </div>
      )}
      {(locStatus === 'denied' || locStatus === 'fallback') && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-700 flex items-center justify-between gap-2">
          <span>⚠️ {locError} 서울 기준으로 표시 중입니다.</span>
          <button onClick={locate} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
            다시 시도
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        {/* 지도 */}
        <div className="lg:w-3/5">
          <div ref={mapRef} className="w-full rounded-2xl overflow-hidden border border-[#ececec]" style={{ height: '550px' }} />
        </div>

        {/* 병원 목록 */}
        <div className="lg:w-2/5 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '550px' }}>
          <p className="text-xs text-[#aaa] px-1 pb-1">총 {hospitals.length}개의 동물병원이 검색되었습니다</p>
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
                className={`bg-white rounded-xl p-3 border cursor-pointer transition-colors ${isSelected ? 'border-[#f5c518] shadow-md' : 'border-[#ececec] hover:border-[#f5c518]'}`}
              >
                <div className="flex items-start gap-2">
                  <div className="text-xl flex-shrink-0">🐾</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#2d2d2d] truncate">{h.name}</p>
                      {h.distance !== undefined && (
                        <span className="text-xs text-[#f5c518] font-medium flex-shrink-0">
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

      {/* 선택된 병원 상세 */}
      {selected && (
        <div className="bg-[#fffbee] border border-[#f5c518] rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-bold text-[#2d2d2d]">🐾 {selected.name}</h3>
              {selected.address && <p className="text-sm text-[#666] mt-1">{selected.address}</p>}
              <div className="flex flex-wrap gap-3 mt-2">
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="text-sm text-[#f5c518] font-bold flex items-center gap-1">
                    <Phone size={13} />{selected.phone}
                  </a>
                )}
                {selected.link && (
                  <a href={selected.link} target="_blank" rel="noopener" className="text-sm text-blue-500 font-bold flex items-center gap-1">
                    <ExternalLink size={13} />상세 정보
                  </a>
                )}
                <a
                  href={`https://map.kakao.com/link/to/${encodeURIComponent(selected.name)},${selected.lat},${selected.lng}`}
                  target="_blank" rel="noopener"
                  className="text-sm text-green-600 font-bold flex items-center gap-1"
                >
                  <Navigation size={13} />길찾기
                </a>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-[#aaa] hover:text-[#444] text-lg font-bold">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
