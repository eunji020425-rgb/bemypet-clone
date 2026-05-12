'use client'

import { useEffect, useRef, useState } from 'react'
import { Footprints, Clock, Route as RouteIcon, AlertCircle } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

interface Props {
  name: string
  dstLat: number
  dstLng: number
  addr: string
}

interface RouteData {
  distance: number // meters
  duration: number // seconds
  geometry: { coordinates: [number, number][] } // [lng, lat]
}

export default function RouteMap({ name, dstLat, dstLng, addr }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const [route, setRoute] = useState<RouteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'foot' | 'driving'>('foot')

  const fetchRoute = async (userLat: number, userLng: number, profile: 'foot' | 'driving') => {
    setLoading(true)
    setError('')
    try {
      const url = `https://router.project-osrm.org/route/v1/${profile}/${userLng},${userLat};${dstLng},${dstLat}?geometries=geojson&overview=full`
      const res = await fetch(url)
      const data = await res.json()
      if (data.code !== 'Ok' || !data.routes?.[0]) {
        throw new Error('경로를 찾을 수 없습니다.')
      }
      const r = data.routes[0]
      const routeData: RouteData = {
        distance: r.distance,
        duration: r.duration,
        geometry: r.geometry,
      }
      setRoute(routeData)
      await drawMap(userLat, userLng, routeData)
    } catch (e: any) {
      setError(e.message || '경로를 가져올 수 없습니다.')
      // 경로 없어도 지도는 표시
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
      // 기존 폴리라인/마커 제거
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
    L.marker([userLat, userLng], { icon: myIcon }).addTo(mapInstanceRef.current).bindPopup('📍 현재 위치').openPopup()

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
    if (routeData) {
      const latlngs: [number, number][] = routeData.geometry.coordinates.map(([lng, lat]) => [lat, lng])
      L.polyline(latlngs, {
        color: '#f5c518',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(mapInstanceRef.current)
      const bounds = L.latLngBounds(latlngs)
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] })
    } else {
      // 경로 없으면 양 끝점 보이게
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

  const switchMode = (newMode: 'foot' | 'driving') => {
    if (newMode === mode || !userPos) return
    setMode(newMode)
    fetchRoute(userPos[0], userPos[1], newMode)
  }

  const formatDistance = (m: number) => m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`
  const formatDuration = (s: number) => {
    const min = Math.round(s / 60)
    if (min < 60) return `${min}분`
    return `${Math.floor(min / 60)}시간 ${min % 60}분`
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 이동 수단 선택 */}
      <div className="flex gap-2">
        <button
          onClick={() => switchMode('foot')}
          className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold transition ${
            mode === 'foot'
              ? 'bg-[#f5c518] text-white'
              : 'bg-white border border-[#ececec] text-[#666] hover:border-[#f5c518]'
          }`}
        >
          🚶 도보
        </button>
        <button
          onClick={() => switchMode('driving')}
          className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold transition ${
            mode === 'driving'
              ? 'bg-[#f5c518] text-white'
              : 'bg-white border border-[#ececec] text-[#666] hover:border-[#f5c518]'
          }`}
        >
          🚗 자동차
        </button>
      </div>

      {/* 경로 정보 */}
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
        <div className="bg-white border border-[#ececec] rounded-2xl p-4 flex items-center gap-6 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#fef3c7] flex items-center justify-center">
              <RouteIcon size={18} className="text-[#92400e]" />
            </div>
            <div>
              <p className="text-xs text-[#aaa]">거리</p>
              <p className="text-base font-bold text-[#2d2d2d]">{formatDistance(route.distance)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#dbeafe] flex items-center justify-center">
              <Clock size={18} className="text-[#1e40af]" />
            </div>
            <div>
              <p className="text-xs text-[#aaa]">예상 시간</p>
              <p className="text-base font-bold text-[#2d2d2d]">{formatDuration(route.duration)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="w-10 h-10 rounded-full bg-[#dcfce7] flex items-center justify-center">
              <Footprints size={18} className="text-[#166534]" />
            </div>
            <div>
              <p className="text-xs text-[#aaa]">목적지</p>
              <p className="text-sm font-bold text-[#2d2d2d] truncate max-w-[200px]">{name}</p>
            </div>
          </div>
        </div>
      )}

      {/* 지도 */}
      <div ref={mapRef} className="w-full rounded-2xl overflow-hidden border border-[#ececec]" style={{ height: '600px' }} />

      <p className="text-xs text-[#aaa] text-center">
        경로 데이터: <a href="https://project-osrm.org" target="_blank" rel="noopener" className="hover:underline">OSRM</a> · 지도: OpenStreetMap
      </p>
    </div>
  )
}
