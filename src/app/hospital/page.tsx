import HospitalMap from './HospitalMap'
import { MapPin } from 'lucide-react'

export default function HospitalPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="text-[#3a7ab8]" size={22} />
        <h1 className="text-xl font-bold text-[#2a3a55]">동물병원 찾기</h1>
        <span className="text-xs text-[#aaa] ml-1">현재 위치 기반 근처 동물병원</span>
      </div>
      <HospitalMap />
    </div>
  )
}
