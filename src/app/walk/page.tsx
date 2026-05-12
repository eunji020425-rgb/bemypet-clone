import WalkPage from './WalkPage'
import { Footprints } from 'lucide-react'

export default function WalkRoutePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Footprints className="text-[#3a7ab8]" size={22} />
        <h1 className="text-xl font-bold text-[#2a3a55]">산책로 추천</h1>
        <span className="text-xs text-[#aaa] ml-1">AI가 추천하는 근처 반려동물 산책로</span>
      </div>
      <WalkPage />
    </div>
  )
}
