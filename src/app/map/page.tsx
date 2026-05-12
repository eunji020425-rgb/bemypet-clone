import AllMap from './AllMap'
import { Map as MapIcon } from 'lucide-react'

export default function MapPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <MapIcon className="text-[#f5c518]" size={22} />
        <h1 className="text-xl font-bold text-[#2d2d2d]">통합 지도</h1>
        <span className="text-xs text-[#aaa] ml-1">동물병원 · 산책로 · 애견 동반 장소 한눈에 보기</span>
      </div>
      <AllMap />
    </div>
  )
}
