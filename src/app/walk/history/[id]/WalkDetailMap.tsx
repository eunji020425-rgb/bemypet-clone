'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

interface Props {
  path: [number, number][]
  trailLat?: number | null
  trailLng?: number | null
  trailName?: string | null
}

export default function WalkDetailMap({ path, trailLat, trailLng, trailName }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (typeof window === 'undefined' || !mapRef.current) return
      const L = (await import('leaflet')).default
      if (cancelled) return

      // 중심점 결정
      const center: [number, number] = path.length > 0
        ? path[Math.floor(path.length / 2)]
        : (trailLat && trailLng ? [trailLat, trailLng] : [37.5665, 126.978])

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current).setView(center, 15)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
        }).addTo(mapInstanceRef.current)
        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100)
      }

      const map = mapInstanceRef.current

      // 경로 polyline
      if (path.length >= 2) {
        const line = L.polyline(path, {
          color: '#3a7ab8',
          weight: 5,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map)

        // 시작 마커 (초록)
        const startIcon = L.divIcon({
          html: `<div style="background:#22c55e;color:white;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold">출발</div>`,
          className: '', iconAnchor: [14, 14],
        })
        L.marker(path[0], { icon: startIcon }).addTo(map)

        // 종료 마커 (빨강)
        const endIcon = L.divIcon({
          html: `<div style="background:#ef4444;color:white;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold">도착</div>`,
          className: '', iconAnchor: [14, 14],
        })
        L.marker(path[path.length - 1], { icon: endIcon }).addTo(map)

        map.fitBounds(line.getBounds(), { padding: [40, 40] })
      } else if (trailLat && trailLng) {
        // 경로 없을 때 산책로 위치만 표시
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
  }, [path, trailLat, trailLng, trailName])

  return (
    <div
      ref={mapRef}
      className="w-full rounded-2xl overflow-hidden border border-[#d6e6ff]"
      style={{ height: '480px' }}
    />
  )
}
