/**
 * 위경도 → 기상청 동네예보 격자(nx, ny) 변환
 * Lambert Conformal Conic Projection
 *
 * 검증: 서울시청(37.5665, 126.9780) → nx=60, ny=127
 */

const RE = 6371.00877       // 지구 반경 (km)
const GRID = 5.0            // 격자 간격 (km)
const SLAT1 = 30.0          // 표준위도1
const SLAT2 = 60.0          // 표준위도2
const OLON = 126.0          // 기준점 경도
const OLAT = 38.0           // 기준점 위도
const XO = 43               // 기준점 X좌표
const YO = 136              // 기준점 Y좌표

const DEG_RAD = Math.PI / 180

export interface Grid {
  nx: number
  ny: number
}

export function latLngToGrid(lat: number, lng: number): Grid {
  const re = RE / GRID
  const slat1 = SLAT1 * DEG_RAD
  const slat2 = SLAT2 * DEG_RAD
  const olon = OLON * DEG_RAD
  const olat = OLAT * DEG_RAD

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn)
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5)
  ro = (re * sf) / Math.pow(ro, sn)

  let ra = Math.tan(Math.PI * 0.25 + lat * DEG_RAD * 0.5)
  ra = (re * sf) / Math.pow(ra, sn)

  let theta = lng * DEG_RAD - olon
  if (theta > Math.PI) theta -= 2.0 * Math.PI
  if (theta < -Math.PI) theta += 2.0 * Math.PI
  theta *= sn

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5)
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5)

  return { nx, ny }
}

/** 격자 변환 검증 (개발용) */
export function verifyGridConversion(): boolean {
  const seoul = latLngToGrid(37.5665, 126.978)
  return seoul.nx === 60 && seoul.ny === 127
}
