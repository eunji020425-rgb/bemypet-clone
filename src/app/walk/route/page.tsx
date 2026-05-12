import RouteMap from './RouteMap'
import { Navigation } from 'lucide-react'
import Link from 'next/link'

export default async function RoutePage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; lat?: string; lng?: string; addr?: string }>
}) {
  const params = await searchParams
  const name = params.name || '목적지'
  const lat = parseFloat(params.lat || '0')
  const lng = parseFloat(params.lng || '0')
  const addr = params.addr || ''

  if (!lat || !lng) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-[#888]">잘못된 접근입니다.</p>
        <Link href="/walk" className="text-[#f5c518] font-bold hover:underline mt-2 inline-block">
          산책로로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Navigation className="text-[#f5c518]" size={20} />
        <Link href="/walk" className="text-sm text-[#888] hover:text-[#f5c518]">← 산책로</Link>
        <h1 className="text-lg font-bold text-[#2d2d2d] ml-2">{name}까지 길찾기</h1>
      </div>
      <RouteMap name={name} dstLat={lat} dstLng={lng} addr={addr} />
    </div>
  )
}
