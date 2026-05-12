import { NextResponse } from 'next/server'

interface Step {
  instruction: string
  distance: number
  duration: number
  lat: number
  lng: number
}

interface RouteResult {
  distance: number
  duration: number
  geometry: [number, number][] // [lat, lng]
  steps: Step[]
}

// OSRM 도보 길찾기 → 한국어 안내 변환
function translateOsrmManeuver(step: any): string {
  const type = step.maneuver?.type
  const modifier = step.maneuver?.modifier
  const roadName = step.name || ''

  const dirMap: Record<string, string> = {
    'left': '좌측',
    'right': '우측',
    'sharp left': '급좌회전',
    'sharp right': '급우회전',
    'slight left': '약간 좌측',
    'slight right': '약간 우측',
    'straight': '직진',
    'uturn': 'U턴',
  }

  const dir = modifier ? dirMap[modifier] || modifier : ''

  switch (type) {
    case 'depart':
      return roadName ? `${roadName}에서 출발` : '출발지에서 출발'
    case 'arrive':
      return '목적지 도착'
    case 'turn':
      return `${dir}으로 회전${roadName ? ` (${roadName})` : ''}`
    case 'continue':
      return `${roadName ? `${roadName}을 따라 ` : ''}계속 직진`
    case 'merge':
      return `${roadName ? `${roadName}에 ` : ''}합류`
    case 'on ramp':
      return '진입로'
    case 'off ramp':
      return '출구로'
    case 'fork':
      return `갈림길에서 ${dir}`
    case 'roundabout':
    case 'rotary':
      return '회전 교차로 진입'
    case 'exit roundabout':
    case 'exit rotary':
      return '회전 교차로 빠져나감'
    case 'new name':
      return roadName ? `${roadName} 진입` : '도로명 변경'
    default:
      return roadName || dir || '이동'
  }
}

async function getOsrmFoot(srcLat: number, srcLng: number, dstLat: number, dstLng: number): Promise<RouteResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/foot/${srcLng},${srcLat};${dstLng},${dstLat}?geometries=geojson&overview=full&steps=true`
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return null
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.[0]) return null
    const r = data.routes[0]
    const steps: Step[] = []
    for (const leg of r.legs || []) {
      for (const s of leg.steps || []) {
        const loc = s.maneuver?.location || [0, 0]
        steps.push({
          instruction: translateOsrmManeuver(s),
          distance: s.distance,
          duration: s.duration,
          lat: loc[1],
          lng: loc[0],
        })
      }
    }
    return {
      distance: r.distance,
      duration: r.duration,
      geometry: r.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]),
      steps,
    }
  } catch {
    return null
  }
}

async function getKakaoCar(srcLat: number, srcLng: number, dstLat: number, dstLng: number): Promise<RouteResult | null> {
  const kakaoKey = process.env.KAKAO_REST_API_KEY?.trim()
  if (!kakaoKey) return null
  try {
    const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${srcLng},${srcLat}&destination=${dstLng},${dstLat}&priority=RECOMMEND`
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${kakaoKey}` },
      next: { revalidate: 60 },
    })
    if (!res.ok) {
      console.error('[route] kakao car error:', await res.text())
      return null
    }
    const data = await res.json()
    const route = data.routes?.[0]
    if (!route || route.result_code !== 0) return null

    const geometry: [number, number][] = []
    const steps: Step[] = []
    for (const section of route.sections || []) {
      for (const road of section.roads || []) {
        // vertexes: [x1, y1, x2, y2, ...]
        const v = road.vertexes || []
        for (let i = 0; i < v.length; i += 2) {
          geometry.push([v[i + 1], v[i]])
        }
      }
      for (const guide of section.guides || []) {
        steps.push({
          instruction: guide.guidance || '',
          distance: guide.distance || 0,
          duration: guide.duration || 0,
          lat: guide.y,
          lng: guide.x,
        })
      }
    }
    return {
      distance: route.summary.distance,
      duration: route.summary.duration,
      geometry,
      steps,
    }
  } catch (e) {
    console.error('[route] kakao car exception:', e)
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const srcLat = parseFloat(searchParams.get('srcLat') || '0')
  const srcLng = parseFloat(searchParams.get('srcLng') || '0')
  const dstLat = parseFloat(searchParams.get('dstLat') || '0')
  const dstLng = parseFloat(searchParams.get('dstLng') || '0')
  const mode = searchParams.get('mode') || 'foot'

  if (!srcLat || !srcLng || !dstLat || !dstLng) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })
  }

  let result: RouteResult | null = null
  if (mode === 'car') {
    result = await getKakaoCar(srcLat, srcLng, dstLat, dstLng)
    // 카카오 실패 시 OSRM driving 폴백
    if (!result) {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${srcLng},${srcLat};${dstLng},${dstLat}?geometries=geojson&overview=full&steps=true`
        const res = await fetch(url)
        const data = await res.json()
        if (data.code === 'Ok' && data.routes?.[0]) {
          const r = data.routes[0]
          const steps: Step[] = []
          for (const leg of r.legs || []) {
            for (const s of leg.steps || []) {
              const loc = s.maneuver?.location || [0, 0]
              steps.push({
                instruction: translateOsrmManeuver(s),
                distance: s.distance,
                duration: s.duration,
                lat: loc[1],
                lng: loc[0],
              })
            }
          }
          result = {
            distance: r.distance,
            duration: r.duration,
            geometry: r.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]),
            steps,
          }
        }
      } catch {}
    }
  } else {
    result = await getOsrmFoot(srcLat, srcLng, dstLat, dstLng)
  }

  if (!result) {
    return NextResponse.json({ error: '경로를 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json(result)
}
