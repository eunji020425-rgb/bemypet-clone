'use client'

import { useEffect, useRef, useState } from 'react'
import { Footprints, Clock, Route as RouteIcon, AlertCircle, ExternalLink, MapPin, ChevronRight } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

interface Props {
  name: string
  dstLat: number
  dstLng: number
  addr: string
}

interface Step {
  instruction: string
  distance: number
  duration: number
  lat: number
  lng: number
}

interface RouteData {
  distance: number
  duration: number
  geometry: [number, number][]
  steps: Step[]
}

export default function RouteMap({ name, dstLat, dstLng, addr }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const [route, setRoute] = useState<RouteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'foot' | 'car'>('foot')

  const fetchRoute = async (userLat: number, userLng: number, m: 'foot' | 'car') => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `/api/route?srcLat=${userLat}&srcLng=${userLng}&dstLat=${dstLat}&dstLng=${dstLng}&mode=${m}`
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || '경로를 가져올 수 없습니다.')
      }
      const data: RouteData = await res.json()
      setRoute(data)
      await drawMap(userLat, userLng, data)
    } catch (e: any) {
      setError(e.message || '경로를 가져올 수 없습니다.')
      setRoute(null)
      await drawMap(userLat, userLng, null)
    } finally {
      setLoading(false)
    }
  }

  const drawMap = async (userLat: number, userLng: number, routeData: RouteData | null) => {
    if (typeof window === 'undefined' || !mapRef.current) return
    const L = (await import('leaflet')).default

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([userLat, userLng], 14)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(mapInstanceRef.current)
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100)
    } else {
      mapInstanceRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.Polyline || layer instanceof L.Marker) {
          mapInstanceRef.current.removeLayer(layer)
        }
      })
    }

    // 내 위치
    const myIcon = L.divIcon({
      html: `<div style="background:#3b82f6;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.2)"></div>`,
      className: '', iconAnchor: [9, 9],
    })
    L.marker([userLat, userLng], { icon: myIcon }).addTo(mapInstanceRef.current).bindPopup('📍 출발 위치')

    // 목적지
    const dstIcon = L.divIcon({
      html: `<div style="position:relative;width:36px;height:42px">
        <div style="background:#86efac;color:white;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);position:absolute;top:0;left:0;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
          <span style="transform:rotate(45deg);font-size:16px">🏁</span>
        </div>
      </div>`,
      className: '', iconAnchor: [18, 42],
    })
    L.marker([dstLat, dstLng], { icon: dstIcon }).addTo(mapInstanceRef.current).bindPopup(`<b>${name}</b><br/>${addr}`)

    // 경로 라인
    if (routeData && routeData.geometry.length > 0) {
      const latlngs = routeData.geometry
      L.polyline(latlngs, {
        color: '#5a7a3a',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(mapInstanceRef.current)
      const bounds = L.latLngBounds(latlngs)
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] })
    } else {
      const bounds = L.latLngBounds([[userLat, userLng], [dstLat, dstLng]])
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] })
    }
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('이 브라우저는 위치 정보를 지원하지 않습니다.')
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lat = coords.latitude, lng = coords.longitude
        setUserPos([lat, lng])
        fetchRoute(lat, lng, mode)
      },
      (err) => {
        setError(
          err.code === 1
            ? '위치 권한이 거부되었습니다. 주소창 좌측 자물쇠 아이콘에서 허용해주세요.'
            : '위치를 가져올 수 없습니다.'
        )
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
    return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null }
  }, [])

  const switchMode = (newMode: 'foot' | 'car') => {
    if (newMode === mode || !userPos) return
    setMode(newMode)
    fetchRoute(userPos[0], userPos[1], newMode)
  }

  const formatDistance = (m: number) => m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`
  const formatDuration = (s: number) => {
    const min = Math.round(s / 60)
    if (min < 1) return '1분 미만'
    if (min < 60) return `${min}분`
    return `${Math.floor(min / 60)}시간 ${min % 60}분`
  }

  // 대중교통은 카카오맵 외부 링크 (한국 대중교통은 카카오/네이버가 가장 정확함)
  const transitUrl = userPos
    ? `https://map.kakao.com/?sName=${encodeURIComponent('현재위치')}&eName=${encodeURIComponent(name)}&sX=${userPos[1]}&sY=${userPos[0]}&eX=${dstLng}&eY=${dstLat}`
    : '#'
  const naverTransitUrl = userPos
    ? `https://map.naver.com/p/directions/${userPos[1]},${userPos[0]},,,PLACE_POI/${dstLng},${dstLat},${encodeURIComponent(name)},,PLACE_POI/-/transit`
    : '#'

  const focusStep = (step: Step) => {
    if (mapInstanceRef.current && step.lat && step.lng) {
      mapInstanceRef.current.setView([step.lat, step.lng], 17)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 이동 수단 탭 */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => switchMode('foot')}
          className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold transition ${
            mode === 'foot'
              ? 'bg-[#5a7a3a] text-white'
              : 'bg-white border border-[#e8e3d0] text-[#666] hover:border-[#5a7a3a]'
          }`}
        >
          🚶 도보
        </button>
        <button
          onClick={() => switchMode('car')}
          className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold transition ${
            mode === 'car'
              ? 'bg-[#5a7a3a] text-white'
              : 'bg-white border border-[#e8e3d0] text-[#666] hover:border-[#5a7a3a]'
          }`}
        >
          🚗 자동차
        </button>
        <a
          href={transitUrl}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold bg-white border border-[#e8e3d0] text-[#666] hover:border-[#5a7a3a] transition"
        >
          🚌 카카오 대중교통 <ExternalLink size={12} />
        </a>
        <a
          href={naverTransitUrl}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold bg-white border border-[#e8e3d0] text-[#666] hover:border-[#5a7a3a] transition"
        >
          🚇 네이버 대중교통 <ExternalLink size={12} />
        </a>
      </div>

      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
          📍 경로를 계산하는 중...
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />{error}
        </div>
      )}
      {route && (
        <div className="bg-white border border-[#e8e3d0] rounded-2xl p-4 flex items-center gap-6 shadow-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#fef3c7] flex items-center justify-center">
              <RouteIcon size={18} className="text-[#92400e]" />
            </div>
            <div>
              <p className="text-xs text-[#aaa]">총 거리</p>
              <p className="text-base font-bold text-[#2d3a22]">{formatDistance(route.distance)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#dbeafe] flex items-center justify-center">
              <Clock size={18} className="text-[#1e40af]" />
            </div>
            <div>
              <p className="text-xs text-[#aaa]">예상 시간</p>
              <p className="text-base font-bold text-[#2d3a22]">{formatDuration(route.duration)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="w-10 h-10 rounded-full bg-[#dcfce7] flex items-center justify-center">
              <Footprints size={18} className="text-[#166534]" />
            </div>
            <div>
              <p className="text-xs text-[#aaa]">목적지</p>
              <p className="text-sm font-bold text-[#2d3a22] truncate max-w-[200px]">{name}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        {/* 지도 */}
        <div className="lg:w-3/5">
          <div ref={mapRef} className="w-full rounded-2xl overflow-hidden border border-[#e8e3d0]" style={{ height: '550px' }} />
        </div>

        {/* 턴바이턴 안내 */}
        <div className="lg:w-2/5 bg-white border border-[#e8e3d0] rounded-2xl p-4 overflow-y-auto" style={{ maxHeight: '550px' }}>
          <h3 className="text-sm font-bold text-[#2d3a22] mb-3 flex items-center gap-2">
            <MapPin size={16} className="text-[#5a7a3a]" />
            상세 길찾기 ({mode === 'foot' ? '도보' : '자동차'})
          </h3>
          {!route && !loading && (
            <p className="text-xs text-[#aaa] text-center py-6">경로 안내가 없습니다.</p>
          )}
          {route && route.steps.length === 0 && (
            <p className="text-xs text-[#aaa] text-center py-6">상세 안내가 제공되지 않습니다.</p>
          )}
          <ol className="flex flex-col gap-2">
            {route?.steps.map((step, i) => (
              <li
                key={i}
                onClick={() => focusStep(step)}
                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#f5f7e8] cursor-pointer transition"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? 'bg-blue-100 text-blue-700' :
                  i === route.steps.length - 1 ? 'bg-green-100 text-green-700' :
                  'bg-[#fef3c7] text-[#92400e]'
                }`}>
                  {i === 0 ? '출발' : i === route.steps.length - 1 ? '도착' : i}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#2d3a22] leading-snug">{step.instruction || '이동'}</p>
                  {(step.distance > 0 || step.duration > 0) && (
                    <p className="text-xs text-[#aaa] mt-0.5">
                      {step.distance > 0 && formatDistance(step.distance)}
                      {step.distance > 0 && step.duration > 0 && ' · '}
                      {step.duration > 0 && formatDuration(step.duration)}
                    </p>
                  )}
                </div>
                <ChevronRight size={14} className="text-[#ccc] mt-1.5 flex-shrink-0" />
              </li>
            ))}
          </ol>
        </div>
      </div>

      <p className="text-xs text-[#aaa] text-center">
        도보: OSRM · 자동차: 카카오 모빌리티 · 대중교통: 카카오/네이버맵 (외부) · 지도: OpenStreetMap
      </p>
    </div>
  )
}
