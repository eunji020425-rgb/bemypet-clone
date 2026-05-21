'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

interface Props {
  path: [number, number][]
  trailLat?: number | null
  trailLng?: number | null
  trailName?: string | null
  startLat?: number | null
  startLng?: number | null
  endLat?: number | null
  endLng?: number | null
}

export default function WalkDetailMap({ path, trailLat, trailLng, trailName, startLat, startLng, endLat, endLng }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (typeof window === 'undefined' || !mapRef.current) return
      const L = (await import('leaflet')).default
      if (cancelled) return

      // 시작/끝 좌표 결정 (path 우선, 없으면 start_lat/lng → end_lat/lng → trail_lat/lng)
      const sPt: [number, number] | null =
        path.length > 0 ? path[0]
        : (startLat != null && startLng != null) ? [startLat, startLng]
        : null
      const ePt: [number, number] | null =
        path.length > 0 ? path[path.length - 1]
        : (endLat != null && endLng != null) ? [endLat, endLng]
        : null

      const center: [number, number] = sPt ?? (trailLat && trailLng ? [trailLat, trailLng] : [37.5665, 126.978])

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current).setView(center, 15)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
        }).addTo(mapInstanceRef.current)
        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100)
      }

      const map = mapInstanceRef.current

      // 시작 마커 (초록 — 출발)
      const startIcon = L.divIcon({
        html: `<div style="background:#22c55e;color:white;width:34px;height:34px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold">출발</div>`,
        className: '', iconAnchor: [17, 17],
      })
      // 종료 마커 (빨강 — 도착)
      const endIcon = L.divIcon({
        html: `<div style="background:#ef4444;color:white;width:34px;height:34px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold">도착</div>`,
        className: '', iconAnchor: [17, 17],
      })

      const bounds: [number, number][] = []

      if (sPt) {
        L.marker(sPt, { icon: startIcon }).addTo(map)
        bounds.push(sPt)
      }
      if (ePt && (!sPt || ePt[0] !== sPt[0] || ePt[1] !== sPt[1])) {
        L.marker(ePt, { icon: endIcon }).addTo(map)
        bounds.push(ePt)
      }

      // 경로 polyline (있으면)
      if (path.length >= 2) {
        const line = L.polyline(path, {
          color: '#3a7ab8',
          weight: 5,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map)
        bounds.push(...path)
      } else if (sPt && ePt && (sPt[0] !== ePt[0] || sPt[1] !== ePt[1])) {
        // GPS 점 없으면 시작-끝 직선 점선
        L.polyline([sPt, ePt], {
          color: '#3a7ab8',
          weight: 4,
          opacity: 0.6,
          dashArray: '10, 8',
        }).addTo(map)
      }

      if (bounds.length >= 2) {
        map.fitBounds(bounds, { padding: [40, 40] })
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 16)
      } else if (trailLat && trailLng) {
        // 좌표 데이터가 전혀 없을 때만 산책로 위치
        const icon = L.divIcon({
          html: `<div style="background:#3a7ab8;color:white;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:16px">🐾</span></div>`,
          className: '', iconAnchor: [16, 32],
        })
        L.marker([trailLat, trailLng], { icon })
          .addTo(map)
          .bindPopup(trailName ?? '산책로')
          .openPopup()
      }
    })()

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [path, trailLat, trailLng, trailName, startLat, startLng, endLat, endLng])

  return (
    <div
      ref={mapRef}
      className="w-full rounded-2xl overflow-hidden border border-[#d6e6ff]"
      style={{ height: '280px' }}
    />
  )
}
