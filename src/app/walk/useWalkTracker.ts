'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * 산책 GPS 트래커
 * - watchPosition 으로 실시간 좌표 수집
 * - haversine 거리 누적
 * - jitter 필터: 5m 미만은 무시, 정확도 50m 초과 좌표는 무시
 * - 산책 중일 때만 활성, 종료 시 watch 해제
 */
export type PathPoint = [number, number]  // [lat, lng]

export function useWalkTracker(active: boolean) {
  const [distance, setDistance] = useState(0)      // m
  const [duration, setDuration] = useState(0)      // s
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [path, setPath] = useState<PathPoint[]>([])

  const watchIdRef = useRef<number | null>(null)
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!active) {
      // 정리
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (tickRef.current) {
        clearInterval(tickRef.current)
        tickRef.current = null
      }
      lastPosRef.current = null
      startTimeRef.current = null
      setDistance(0)
      setDuration(0)
      setCoords(null)
      setPath([])
      return
    }

    if (typeof window === 'undefined' || !navigator.geolocation) return

    startTimeRef.current = Date.now()

    // 1초마다 duration 업데이트
    tickRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }
    }, 1000)

    // GPS 추적
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        if (accuracy > 50) return  // 부정확한 좌표 무시
        setCoords({ lat: latitude, lng: longitude })

        const last = lastPosRef.current
        if (last) {
          const d = haversine(last.lat, last.lng, latitude, longitude)
          if (d >= 5 && d < 200) {
            // 5m~200m 사이의 합리적 이동만 거리에 더함 (GPS 점프 방지)
            setDistance(prev => prev + d)
            setPath(prev => [...prev, [latitude, longitude]])
            lastPosRef.current = { lat: latitude, lng: longitude }
          }
        } else {
          lastPosRef.current = { lat: latitude, lng: longitude }
          setPath([[latitude, longitude]])  // 시작점
        }
      },
      (err) => {
        console.warn('[walk tracker] watchPosition error', err.message)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (tickRef.current) {
        clearInterval(tickRef.current)
        tickRef.current = null
      }
    }
  }, [active])

  return { distance, duration, coords, path }
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000  // meters
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`
  return `${(m / 1000).toFixed(2)}km`
}

export function formatDurationShort(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}
