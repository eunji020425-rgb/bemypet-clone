'use client'

import { useEffect, useRef, useState } from 'react'
import { Footprints, Navigation, Clock, Route, ChevronDown } from 'lucide-react'

interface Trail {
  name: string
  description: string
  distance: string
  duration: string
  difficulty: string
  features: string[]
  address: string
  lat: number
  lng: number
  tip: string
}

const DIFF_COLOR: Record<string, string> = {
  '쉬움': 'text-green-600 bg-green-50',
  '보통': 'text-yellow-600 bg-yellow-50',
  '어려움': 'text-red-600 bg-red-50',
}

export default function WalkPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [trails, setTrails] = useState<Trail[]>([])
  const [loading, setLoading] = useState(false)
  const [petType, setPetType] = useState('강아지')
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const [selected, setSelected] = useState<Trail | null>(null)
  const [error, setError] = useState('')

  const initMap = async (lat: number, lng: number, trailList: Trail[]) => {
    const L = (await import('leaflet')).default
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current!).setView([lat, lng], 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(mapInstanceRef.current)
    } else {
      mapInstanceRef.current.setView([lat, lng], 13)
      mapInstanceRef.current.eachLayer((layer: any) => {
        if (layer._latlng) mapInstanceRef.current.removeLayer(layer)
      })
    }

    const L2 = (await import('leaflet')).default
    // 내 위치
    const myIcon = L2.divIcon({
      html: `<div style="background:#f5c518;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
      className: '', iconAnchor: [8, 8],
    })
    L2.marker([lat, lng], { icon: myIcon }).addTo(mapInstanceRef.current).bindPopup('📍 현재 위치')

    // 산책로 마커
    trailList.forEach((t, i) => {
      if (!t.lat || !t.lng) return
      const icon = L2.divIcon({
        html: `<div style="background:#22c55e;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🐾</div>`,
        className: '', iconAnchor: [15, 15],
      })
      L2.marker([t.lat, t.lng], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>${t.name}</b><br/>${t.distance} · ${t.duration}`)
    })
  }

  const recommend = async (lat: number, lng: number) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/gemini/walk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, petType }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTrails(data.trails || [])
      await initMap(lat, lng, data.trails || [])
    } catch (e: any) {
      setError('산책로 추천을 가져오지 못했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const locate = () => {
    if (!navigator.geolocation) return
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords
        setUserPos([lat, lng])
        recommend(lat, lng)
      },
      () => {
        const lat = 37.5665, lng = 126.978
        setUserPos([lat, lng])
        recommend(lat, lng)
      }
    )
  }

  useEffect(() => {
    locate()
    return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* 컨트롤 */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={petType}
          onChange={e => setPetType(e.target.value)}
          className="border border-[#ececec] rounded-full px-4 py-2 text-sm outline-none focus:border-[#f5c518] bg-white"
        >
          <option>강아지</option>
          <option>고양이</option>
          <option>소형견</option>
          <option>대형견</option>
          <option>노령견</option>
        </select>
        <button
          onClick={locate}
          disabled={loading}
          className="flex items-center gap-2 bg-[#f5c518] hover:bg-[#e0b010] text-white px-5 py-2 rounded-full text-sm font-bold transition disabled:opacity-60"
        >
          <Navigation size={15} />
          {loading ? '추천 중...' : '내 위치로 추천받기'}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex flex-col lg:flex-row gap-4">
        {/* 지도 */}
        <div className="lg:w-3/5">
          <div ref={mapRef} className="w-full rounded-2xl overflow-hidden border border-[#ececec]" style={{ height: '480px' }} />
        </div>

        {/* 산책로 목록 */}
        <div className="lg:w-2/5 flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: '480px' }}>
          {loading && (
            <div className="text-center py-10">
              <div className="text-3xl mb-2 animate-bounce">🐾</div>
              <p className="text-sm text-[#aaa]">AI가 산책로를 추천하고 있어요...</p>
            </div>
          )}
          {!loading && trails.length === 0 && !error && (
            <div className="text-center py-10 text-[#aaa] text-sm">위치를 기반으로 산책로를 추천받으세요!</div>
          )}
          {trails.map((t, i) => (
            <div
              key={i}
              onClick={() => {
                setSelected(selected?.name === t.name ? null : t)
                if (t.lat && t.lng) mapInstanceRef.current?.setView([t.lat, t.lng], 15)
              }}
              className={`bg-white rounded-xl p-4 border cursor-pointer transition-colors ${selected?.name === t.name ? 'border-[#f5c518] shadow-md' : 'border-[#ececec] hover:border-[#22c55e]'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🐾</span>
                    <h3 className="font-bold text-[#2d2d2d] text-sm">{t.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLOR[t.difficulty] ?? 'text-gray-600 bg-gray-50'}`}>
                      {t.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-[#666] mb-2 line-clamp-2">{t.description}</p>
                  <div className="flex gap-3 text-xs text-[#aaa]">
                    <span className="flex items-center gap-1"><Route size={11} />{t.distance}</span>
                    <span className="flex items-center gap-1"><Clock size={11} />{t.duration}</span>
                  </div>
                </div>
                <ChevronDown size={16} className={`text-[#aaa] transition-transform flex-shrink-0 ${selected?.name === t.name ? 'rotate-180' : ''}`} />
              </div>

              {selected?.name === t.name && (
                <div className="mt-3 pt-3 border-t border-[#ececec]">
                  <p className="text-xs text-[#555] mb-2">{t.address}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {t.features?.map((f, j) => (
                      <span key={j} className="text-xs bg-[#f5f5f5] px-2 py-0.5 rounded-full text-[#666]">{f}</span>
                    ))}
                  </div>
                  <div className="bg-[#fffbee] rounded-lg px-3 py-2 text-xs text-[#7a6000]">
                    💡 {t.tip}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
