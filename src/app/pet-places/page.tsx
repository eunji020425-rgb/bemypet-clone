import PetPlacesMap from './PetPlacesMap'
import { PawPrint } from 'lucide-react'

export default function PetPlacesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <PawPrint className="text-[#5a7a3a]" size={22} />
        <h1 className="text-xl font-bold text-[#2d3a22]">애견 동반 장소</h1>
        <span className="text-xs text-[#aaa] ml-1">근처 애견 동반 식당·카페·운동장</span>
      </div>
      <PetPlacesMap />
    </div>
  )
}
