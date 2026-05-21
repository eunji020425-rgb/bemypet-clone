/**
 * Leaflet 마커 유틸 — danger_reports를 지도에 그리기 위한 헬퍼
 *
 * 사용처: WalkPage / AllMap 등 Leaflet 인스턴스를 쓰는 곳에서 import
 * Leaflet 자체는 동적 import로 받으므로 SSR 안전.
 */

import { DANGER_META, type DangerCategory, type DangerReport } from '@/lib/danger/types'
import { formatTimeRemaining } from '@/lib/danger/expiration'

type LeafletNs = typeof import('leaflet')

export function makeDangerIcon(L: LeafletNs, category: DangerCategory) {
  const meta = DANGER_META[category]
  return L.divIcon({
    html: `<div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center">
      <div style="position:absolute;inset:0;border-radius:50%;background:${meta.color};opacity:0.18"></div>
      <div style="position:relative;width:30px;height:30px;border-radius:50%;background:${meta.color};display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">
        <span>${meta.emoji}</span>
      </div>
    </div>`,
    className: '',
    iconAnchor: [18, 18],
  })
}

export function makeDangerPopupHtml(r: DangerReport): string {
  const meta = DANGER_META[r.category]
  const remaining = formatTimeRemaining(r.expires_at)
  const created = new Date(r.created_at)
  const createdStr =
    `${created.getMonth() + 1}/${created.getDate()} ` +
    `${String(created.getHours()).padStart(2, '0')}:${String(created.getMinutes()).padStart(2, '0')}`
  return `
    <div style="min-width:140px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="font-size:18px">${meta.emoji}</span>
        <strong style="color:${meta.color};font-size:14px">${meta.label}</strong>
      </div>
      <div style="font-size:11px;color:#6a7c95;line-height:1.5">
        등록: ${createdStr}<br/>
        ${remaining}
        ${r.radius_m ? `<br/>반경 ${r.radius_m}m` : ''}
      </div>
    </div>
  `
}

/**
 * 지도에 위험 제보 마커들을 한 번에 갱신
 * @returns 추가된 Leaflet 마커 배열
 */
export async function renderDangerReports(
  map: import('leaflet').Map,
  reports: DangerReport[],
  prevMarkers: import('leaflet').Marker[],
): Promise<import('leaflet').Marker[]> {
  prevMarkers.forEach(m => m.remove())
  if (reports.length === 0) return []

  const L = (await import('leaflet')).default
  const out: import('leaflet').Marker[] = []
  for (const r of reports) {
    const icon = makeDangerIcon(L, r.category)
    const marker = L.marker([r.lat, r.lng], { icon, zIndexOffset: 800 })
      .addTo(map)
      .bindPopup(makeDangerPopupHtml(r))
    out.push(marker)
  }
  return out
}
