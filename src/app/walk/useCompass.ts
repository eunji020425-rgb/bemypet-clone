'use client'

import { useEffect, useState } from 'react'

/**
 * 디바이스 나침반
 * - iOS Safari: DeviceOrientationEvent.requestPermission() 필요
 * - 그 외: 자동으로 listen
 * - 결과: 0 (북) ~ 360 시계방향
 */
export function useCompass(active: boolean) {
  const [heading, setHeading] = useState<number | null>(null)
  const [needsPermission, setNeedsPermission] = useState(false)
  const [unsupported, setUnsupported] = useState(false)

  useEffect(() => {
    if (!active) return
    if (typeof window === 'undefined') return

    // iOS 13+ 권한 필요 여부 체크
    const DOE = (window as any).DeviceOrientationEvent
    if (!DOE) {
      setUnsupported(true)
      return
    }

    if (typeof DOE.requestPermission === 'function') {
      setNeedsPermission(true)
      return // 사용자가 버튼 누를 때까지 대기
    }

    const handler = (e: DeviceOrientationEvent) => {
      const evt: any = e
      let h: number | null = null
      if (typeof evt.webkitCompassHeading === 'number') {
        h = evt.webkitCompassHeading  // iOS: 0=북, 시계방향
      } else if (typeof evt.alpha === 'number') {
        h = 360 - evt.alpha  // alpha: 0=북, 반시계 → 보정
      }
      if (h != null) setHeading(((h % 360) + 360) % 360)
    }
    window.addEventListener('deviceorientation', handler, true)
    return () => window.removeEventListener('deviceorientation', handler, true)
  }, [active])

  const requestPermission = async () => {
    const DOE = (window as any).DeviceOrientationEvent
    if (typeof DOE?.requestPermission !== 'function') return
    try {
      const state = await DOE.requestPermission()
      if (state === 'granted') {
        setNeedsPermission(false)
        const handler = (e: DeviceOrientationEvent) => {
          const evt: any = e
          let h: number | null = null
          if (typeof evt.webkitCompassHeading === 'number') h = evt.webkitCompassHeading
          else if (typeof evt.alpha === 'number') h = 360 - evt.alpha
          if (h != null) setHeading(((h % 360) + 360) % 360)
        }
        window.addEventListener('deviceorientation', handler, true)
      }
    } catch {}
  }

  return { heading, needsPermission, unsupported, requestPermission }
}

/** 두 점 사이 방위각 (북=0, 시계방향, degree) */
export function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => d * Math.PI / 180
  const toDeg = (r: number) => r * 180 / Math.PI
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δλ = toRad(lng2 - lng1)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}
