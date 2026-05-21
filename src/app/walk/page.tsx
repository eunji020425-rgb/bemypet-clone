import WalkPage from './WalkPage'
import Link from 'next/link'
import { Footprints, TrendingUp } from 'lucide-react'

export default function WalkRoutePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Footprints className="text-[#3a7ab8]" size={22} />
        <h1 className="text-xl font-bold text-[#2a3a55]">산책로 추천</h1>
        <span className="text-xs text-[#aaa] ml-1 hidden sm:inline">AI가 추천하는 근처 반려동물 산책로</span>
        <Link
          href="/walk/history"
          className="ml-auto flex items-center gap-1 text-xs text-[#3a7ab8] hover:underline font-bold"
        >
          <TrendingUp size={13} />
          내 산책 이력
        </Link>
      </div>
      <WalkPage />
    </div>
  )
}
