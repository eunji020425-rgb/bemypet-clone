import RouteMap from './RouteMap'
import { Navigation } from 'lucide-react'
import Link from 'next/link'

export default async function RoutePage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; lat?: string; lng?: string; addr?: string; from?: string }>
}) {
  const params = await searchParams
  const name = params.name || '목적지'
  const lat = parseFloat(params.lat || '0')
  const lng = parseFloat(params.lng || '0')
  const addr = params.addr || ''
  const from = params.from || 'walk' // 'walk' or 'hospital'

  if (!lat || !lng) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-[#888]">잘못된 접근입니다.</p>
        <Link href="/walk" className="text-[#3a7ab8] font-bold hover:underline mt-2 inline-block">
          돌아가기
        </Link>
      </div>
    )
  }

  const backHref =
    from === 'hospital' ? '/hospital' :
    from === 'pet-places' ? '/pet-places' :
    from === 'map' ? '/map' :
    '/walk'
  const backLabel =
    from === 'hospital' ? '동물병원' :
    from === 'pet-places' ? '애견 동반 장소' :
    from === 'map' ? '통합 지도' :
    '산책로'

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Navigation className="text-[#3a7ab8]" size={20} />
        <Link href={backHref} className="text-sm text-[#888] hover:text-[#3a7ab8]">← {backLabel}</Link>
        <h1 className="text-lg font-bold text-[#2a3a55] ml-2">{name}까지 길찾기</h1>
      </div>
      <RouteMap name={name} dstLat={lat} dstLng={lng} addr={addr} />
    </div>
  )
}
