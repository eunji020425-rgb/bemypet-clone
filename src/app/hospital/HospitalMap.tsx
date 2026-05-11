'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Phone, Clock, Search, Navigation } from 'lucide-react'

interface Hospital {
  title: string
  address: string
  roadAddress: string
  telephone: string
  mapx: string
  mapy: string
  link: string
  category: string
}

function stripHtml(str: string) {
  return str.replace(/<[^>]+>/g, '')
}

// 좌표 변환 (네이버 KATEC → WGS84)
function katecToWgs84(x: number, y: number): [number, number] {
  const lon = x / 1e7
  const lat = y / 1e7
  return [lat, lon]
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
  const [searchQuery, setSearchQuery] = useState('동물병원')
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  const search = async (query: string, lat?: number, lng?: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/hospitals?query=${encodeURIComponent(query)}&display=20`)
      const data = await res.json()
      const items: Hospital[] = (data.items || []).filter((h: Hospital) => h.mapx && h.mapy)

      // 거리순 정렬
      if (lat && lng) {
        items.sort((a, b) => {
          const [aLat, aLon] = katecToWgs84(parseInt(a.mapx), parseInt(a.mapy))
          const [bLat, bLon] = katecToWgs84(parseInt(b.mapx), parseInt(b.mapy))
          return calcDistance(lat, lng, aLat, aLon) - calcDistance(lat, lng, bLat, bLon)
        })
      }
      setHospitals(items)
      return items
    } finally {
      setLoading(false)
    }
  }

  const initMap = async (lat: number, lng: number, items: Hospital[]) => {
    if (typeof window === 'undefined') return
    const L = (await import('leaflet')).default

    // 기존 마커 제거
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current!).setView([lat, lng], 14)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(mapInstanceRef.current)
    } else {
      mapInstanceRef.current.setView([lat, lng], 14)
    }

    // 내 위치 마커
    const myIcon = L.divIcon({
      html: `<div style="background:#f5c518;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
      className: '', iconAnchor: [8, 8],
    })
    L.marker([lat, lng], { icon: myIcon }).addTo(mapInstanceRef.current)
      .bindPopup('📍 현재 위치')

    // 병원 마커
    items.forEach((h, i) => {
      const [hLat, hLon] = katecToWgs84(parseInt(h.mapx), parseInt(h.mapy))
      const icon = L.divIcon({
        html: `<div style="background:#ef4444;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer">${i + 1}</div>`,
        className: '', iconAnchor: [14, 14],
      })
      const marker = L.marker([hLat, hLon], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>${stripHtml(h.title)}</b><br/>${h.roadAddress || h.address}`)
      marker.on('click', () => setSelected(h))
      markersRef.current.push(marker)
    })
  }

  const locate = () => {
    if (!navigator.geolocation) return
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords
        setUserPos([lat, lng])
        const items = await search(searchQuery, lat, lng)
        await initMap(lat, lng, items)
      },
      () => {
        // 위치 거부 시 서울 기본값
        const lat = 37.5665, lng = 126.978
        search(searchQuery, lat, lng).then(items => initMap(lat, lng, items))
      }
    )
  }

  useEffect(() => {
    locate()
    return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const lat = userPos?.[0] ?? 37.5665
    const lng = userPos?.[1] ?? 126.978
    search(searchQuery, lat, lng).then(items => initMap(lat, lng, items))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 검색창 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="동물병원 검색..."
          className="flex-1 border border-[#ececec] rounded-full px-4 py-2 text-sm outline-none focus:border-[#f5c518]"
        />
        <button type="submit" className="bg-[#f5c518] hover:bg-[#e0b010] text-white px-4 py-2 rounded-full text-sm font-bold transition">
          <Search size={16} />
        </button>
        <button type="button" onClick={locate} className="border border-[#ececec] px-3 py-2 rounded-full hover:bg-gray-50 transition">
          <Navigation size={16} className="text-[#888]" />
        </button>
      </form>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* 지도 */}
        <div className="lg:w-3/5">
          <div ref={mapRef} className="w-full rounded-2xl overflow-hidden border border-[#ececec]" style={{ height: '500px' }} />
        </div>

        {/* 병원 목록 */}
        <div className="lg:w-2/5 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '500px' }}>
          {loading && (
            <div className="text-center py-10 text-[#aaa] text-sm">검색 중...</div>
          )}
          {!loading && hospitals.length === 0 && (
            <div className="text-center py-10 text-[#aaa] text-sm">검색 결과가 없습니다.</div>
          )}
          {hospitals.map((h, i) => {
            const [hLat, hLon] = katecToWgs84(parseInt(h.mapx), parseInt(h.mapy))
            const dist = userPos ? calcDistance(userPos[0], userPos[1], hLat, hLon) : null
            const isSelected = selected?.title === h.title
            return (
              <div
                key={i}
                onClick={() => {
                  setSelected(h)
                  mapInstanceRef.current?.setView([hLat, hLon], 16)
                  markersRef.current[i]?.openPopup()
                }}
                className={`bg-white rounded-xl p-3 border cursor-pointer transition-colors ${isSelected ? 'border-[#f5c518] shadow-md' : 'border-[#ececec] hover:border-[#f5c518]'}`}
              >
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#2d2d2d] truncate">{stripHtml(h.title)}</p>
                    <p className="text-xs text-[#888] truncate mt-0.5">{h.roadAddress || h.address}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {h.telephone && (
                        <span className="text-xs text-[#aaa] flex items-center gap-1">
                          <Phone size={10} />{h.telephone}
                        </span>
                      )}
                      {dist !== null && (
                        <span className="text-xs text-[#f5c518] font-medium">
                          {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                        </span>
                      )}
                    </div>
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
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-[#2d2d2d]">{stripHtml(selected.title)}</h3>
              <p className="text-sm text-[#666] mt-1">{selected.roadAddress || selected.address}</p>
              {selected.telephone && (
                <a href={`tel:${selected.telephone}`} className="text-sm text-[#f5c518] font-bold mt-1 flex items-center gap-1">
                  <Phone size={13} />{selected.telephone}
                </a>
              )}
            </div>
            <button onClick={() => setSelected(null)} className="text-[#aaa] hover:text-[#444] text-lg font-bold">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
