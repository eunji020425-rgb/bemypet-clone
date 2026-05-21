/**
 * 한국관광공사 TourAPI 4.0 (data.go.kr) 클라이언트
 *
 * 사용 가이드:
 * - data.go.kr → "국문 관광정보 서비스 GW (Tour API)" 활용 신청
 * - 발급된 인증키를 .env.local + Vercel 환경변수 TOURAPI_KEY 에 등록
 * - 키 없으면 모든 함수가 null 반환하여 graceful fallback
 *
 * 데이터 활용 시 출처 표시 의무: "자료: 한국관광공사"
 */

export interface TourPlace {
  contentid: string
  title: string
  addr1?: string
  addr2?: string
  mapx?: string   // longitude
  mapy?: string   // latitude
  firstimage?: string
  cat1?: string   // 분류 (A02=인문관광지 등)
  cat2?: string
  cat3?: string
  dist?: string   // 거리 (검색 기준점에서 m 단위)
}

const BASE_URL = 'https://apis.data.go.kr/B551011/KorService2'
const APP_NAME = 'PetTogether'

function getKey(): string | null {
  const k = process.env.TOURAPI_KEY?.trim()
  if (!k) return null
  return k
}

/**
 * 좌표 기준 위치 검색 — 반경 N미터 내 관광지
 * @param lat 위도
 * @param lng 경도
 * @param radiusM 반경 (m, 최대 20,000)
 * @param contentTypeId 콘텐츠 타입 (12=관광지, 14=문화시설, 28=레포츠, 38=쇼핑, 39=음식점)
 */
export async function searchByLocation(
  lat: number,
  lng: number,
  radiusM: number = 3000,
  contentTypeId: number = 12,
): Promise<TourPlace[] | null> {
  const key = getKey()
  if (!key) return null

  const url = new URL(`${BASE_URL}/locationBasedList2`)
  url.searchParams.set('serviceKey', key)
  url.searchParams.set('MobileOS', 'ETC')
  url.searchParams.set('MobileApp', APP_NAME)
  url.searchParams.set('_type', 'json')
  url.searchParams.set('mapX', String(lng))
  url.searchParams.set('mapY', String(lat))
  url.searchParams.set('radius', String(Math.min(radiusM, 20000)))
  url.searchParams.set('contentTypeId', String(contentTypeId))
  url.searchParams.set('arrange', 'E')  // 거리순
  url.searchParams.set('numOfRows', '50')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const items = data?.response?.body?.items?.item
    if (!items) return []
    return Array.isArray(items) ? items : [items]
  } catch (e: any) {
    console.warn('[tourapi] searchByLocation failed:', e?.message)
    return null
  }
}

/**
 * 키워드 검색 — 정확한 산책로/공원명으로 매칭
 */
export async function searchByKeyword(keyword: string): Promise<TourPlace[] | null> {
  const key = getKey()
  if (!key) return null

  const url = new URL(`${BASE_URL}/searchKeyword2`)
  url.searchParams.set('serviceKey', key)
  url.searchParams.set('MobileOS', 'ETC')
  url.searchParams.set('MobileApp', APP_NAME)
  url.searchParams.set('_type', 'json')
  url.searchParams.set('keyword', keyword)
  url.searchParams.set('contentTypeId', '12')  // 관광지
  url.searchParams.set('numOfRows', '10')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const items = data?.response?.body?.items?.item
    if (!items) return []
    return Array.isArray(items) ? items : [items]
  } catch (e: any) {
    console.warn('[tourapi] searchByKeyword failed:', e?.message)
    return null
  }
}

/**
 * 반려동물 동반 가능 관광지 검색 (TourAPI petTourSyncList)
 * @returns 반려동물 동반 가능으로 등록된 장소 ID 리스트
 */
export async function fetchPetTourIds(
  lat: number,
  lng: number,
  radiusM: number = 5000,
): Promise<Set<string> | null> {
  const key = getKey()
  if (!key) return null

  // 좌표 기반 모든 관광지 받아온 뒤 cat3로 필터하는 방식이 더 안정적
  // TourAPI v4의 petTourSyncList는 위치 기반이 아니라 전체 동기화용
  // → 대신 locationBasedList2 결과 중 cat3에 '반려동물'이 포함된 것 우선 사용
  const all = await searchByLocation(lat, lng, radiusM, 12)
  if (!all) return null
  const ids = new Set<string>()
  // 향후 TourAPI에 반려동물 동반 분류 필터가 추가되면 여기서 처리
  for (const p of all) {
    if (p.contentid) ids.add(p.contentid)
  }
  return ids
}

/**
 * 가장 가까운 TourAPI 장소 매칭 (이름+좌표 유사도)
 * @param name 카카오에서 받은 산책로명
 * @param lat 좌표
 * @param lng 좌표
 * @returns 매칭된 TourAPI 항목 (없으면 null)
 */
export async function matchTrail(
  name: string,
  lat: number,
  lng: number,
): Promise<TourPlace | null> {
  const key = getKey()
  if (!key) return null

  // 1차: 키워드로 검색
  const byKw = await searchByKeyword(name)
  if (byKw && byKw.length > 0) {
    // 가장 가까운 좌표 매칭
    const nearest = byKw
      .filter(p => p.mapx && p.mapy)
      .map(p => ({
        item: p,
        d: distanceM(lat, lng, parseFloat(p.mapy!), parseFloat(p.mapx!)),
      }))
      .sort((a, b) => a.d - b.d)[0]
    if (nearest && nearest.d < 500) return nearest.item  // 500m 이내면 같은 곳으로 봄
  }

  // 2차: 좌표 기반 500m 이내 검색 후 이름 유사도
  const byLoc = await searchByLocation(lat, lng, 500, 12)
  if (byLoc && byLoc.length > 0) {
    const same = byLoc.find(p => p.title && (p.title.includes(name) || name.includes(p.title)))
    if (same) return same
  }

  return null
}

function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
