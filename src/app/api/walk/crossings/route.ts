import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// 좌표 배열 → 반경 30m 안에 횡단보도가 몇 개 있는지 (Overpass API)
export async function POST(request: Request) {
  try {
    const { geometry } = await request.json() as { geometry: [number, number][] }
    if (!Array.isArray(geometry) || geometry.length < 2) {
      return NextResponse.json({ count: 0 })
    }

    // 경로 bounding box (조금 여유 두기)
    let minLat = geometry[0][0], maxLat = geometry[0][0]
    let minLng = geometry[0][1], maxLng = geometry[0][1]
    for (const [lat, lng] of geometry) {
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
    }
    const pad = 0.001  // 약 100m 여유
    minLat -= pad; maxLat += pad; minLng -= pad; maxLng += pad

    // Overpass 쿼리: highway=crossing 노드만
    const query = `[out:json][timeout:8];
node[highway=crossing](${minLat},${minLng},${maxLat},${maxLng});
out body;`

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return NextResponse.json({ count: 0, error: 'overpass-failed' })
    }

    const data = await res.json()
    const nodes = (data.elements ?? []) as Array<{ lat: number; lon: number }>

    // 경로 30m 이내 노드만 카운트
    const NEAR_M = 30
    let count = 0
    for (const n of nodes) {
      for (const [lat, lng] of geometry) {
        const d = haversine(n.lat, n.lon, lat, lng)
        if (d <= NEAR_M) { count++; break }
      }
    }

    return NextResponse.json({ count })
  } catch (e: any) {
    return NextResponse.json({ count: 0, error: e?.message ?? 'unknown' })
  }
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
