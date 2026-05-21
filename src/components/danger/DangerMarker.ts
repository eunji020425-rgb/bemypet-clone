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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] ?? c))
}

export function makeDangerPopupHtml(r: DangerReport): string {
  const meta = DANGER_META[r.category]
  const remaining = formatTimeRemaining(r.expires_at)
  const created = new Date(r.created_at)
  const createdStr =
    `${created.getMonth() + 1}/${created.getDate()} ` +
    `${String(created.getHours()).padStart(2, '0')}:${String(created.getMinutes()).padStart(2, '0')}`
  const noteHtml = r.note
    ? `<div style="font-size:12px;color:#2a3a55;margin-top:6px;padding:6px 8px;background:#f1f5f9;border-radius:6px;border-left:3px solid ${meta.color}">${escapeHtml(r.note)}</div>`
    : ''
  return `
    <div style="min-width:160px;max-width:220px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="font-size:18px">${meta.emoji}</span>
        <strong style="color:${meta.color};font-size:14px">${meta.label}</strong>
      </div>
      <div style="font-size:11px;color:#6a7c95;line-height:1.5">
        등록: ${createdStr}<br/>
        ${remaining}
        ${r.radius_m ? `<br/>반경 ${r.radius_m}m` : ''}
      </div>
      ${noteHtml}
    </div>
  `
}

/**
 * 같은(±2m 이내) 좌표에 마커가 여러 개면 살짝 원형 오프셋으로 분산
 * (한 사용자가 같은 위치에 여러 카테고리 신고하는 케이스 처리)
 */
function spreadOverlaps(reports: DangerReport[]): Array<DangerReport & { offsetIdx: number; siblingCount: number }> {
  const KEY_PRECISION = 5 // 약 1m
  const groups = new Map<string, DangerReport[]>()
  for (const r of reports) {
    const key = `${r.lat.toFixed(KEY_PRECISION)},${r.lng.toFixed(KEY_PRECISION)}`
    const arr = groups.get(key) ?? []
    arr.push(r)
    groups.set(key, arr)
  }
  const out: Array<DangerReport & { offsetIdx: number; siblingCount: number }> = []
  for (const arr of groups.values()) {
    arr.forEach((r, i) => out.push({ ...r, offsetIdx: i, siblingCount: arr.length }))
  }
  return out
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
  const spread = spreadOverlaps(reports)

  for (const r of spread) {
    let lat = r.lat
    let lng = r.lng
    if (r.siblingCount > 1) {
      // 원형으로 분산 — 약 8m 반경
      const angle = (r.offsetIdx / r.siblingCount) * Math.PI * 2
      const radiusDeg = 0.00007 // 약 8m
      lat += Math.cos(angle) * radiusDeg
      lng += Math.sin(angle) * radiusDeg
    }
    const icon = makeDangerIcon(L, r.category)
    const marker = L.marker([lat, lng], { icon, zIndexOffset: 800 })
      .addTo(map)
      .bindPopup(makeDangerPopupHtml(r))
    out.push(marker)
  }
  return out
}
