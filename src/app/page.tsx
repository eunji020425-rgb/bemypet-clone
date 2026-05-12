import Link from 'next/link'
import { MessageCircle, PenSquare, Users, Map as MapIcon, Stethoscope, Footprints } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* 히어로 섹션 */}
      <section className="text-center py-12">
        <p className="text-xs text-[#5a7a3a] font-semibold tracking-[3px] uppercase">— welcome —</p>
        <h1 className="mt-4 text-[#2d3a22] leading-[1.05] tracking-[-1.5px]" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(36px, 6vw, 56px)' }}>
          a calm space<br/>
          for you and your <span className="italic text-[#5a7a3a]">pet</span>
        </h1>
        <p className="mt-6 text-[#6b7560] text-sm leading-relaxed max-w-md mx-auto">
          반려동물과 함께하는 모든 순간을<br/>
          한 곳에 자연스럽게 담아 보세요
        </p>

        {/* 통합 검색 */}
        <div className="mt-8 max-w-md mx-auto relative">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#94c068]">🔍</span>
          <input
            type="text"
            placeholder="장소, 병원, 카페 검색"
            className="w-full backdrop-blur-xl bg-white/65 border border-white/50 rounded-full pl-12 pr-5 py-3.5 text-sm outline-none text-[#2d3a22] placeholder:text-[#6b7560]"
          />
        </div>

        {/* 빠른 액션 */}
        <div className="flex justify-center gap-3 mt-8 flex-wrap">
          <Link href="/map" className="group">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-[#e8f3d0] flex items-center justify-center group-hover:scale-105 transition-transform border border-white/50">
                <MapIcon size={22} className="text-[#5a7a3a]" />
              </div>
              <span className="text-xs text-[#2d3a22] font-medium">지도</span>
            </div>
          </Link>
          <Link href="/community" className="group">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-[#f5ead4] flex items-center justify-center group-hover:scale-105 transition-transform border border-white/50">
                <Users size={22} className="text-[#a87a50]" />
              </div>
              <span className="text-xs text-[#2d3a22] font-medium">커뮤니티</span>
            </div>
          </Link>
          <Link href="/chat" className="group">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-[#d4e8b0] flex items-center justify-center group-hover:scale-105 transition-transform border border-white/50">
                <MessageCircle size={22} className="text-[#5a7a3a]" />
              </div>
              <span className="text-xs text-[#2d3a22] font-medium">실시간채팅</span>
            </div>
          </Link>
          <Link href="/ai-doctor" className="group">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-[#fdfaf0] flex items-center justify-center group-hover:scale-105 transition-transform border border-[#e8e3d0]">
                <Stethoscope size={22} className="text-[#5a7a3a]" />
              </div>
              <span className="text-xs text-[#2d3a22] font-medium">AI닥터</span>
            </div>
          </Link>
        </div>
      </section>

      {/* 메인 카드 - 통합 지도 추천 */}
      <Link href="/map" className="block">
        <section className="mt-6 backdrop-blur-xl bg-white/65 border border-white/50 rounded-3xl p-7 hover:bg-white/75 transition-colors">
          <p className="text-[10px] text-[#5a7a3a] tracking-[2px] uppercase font-semibold">— today —</p>
          <h3 className="mt-2 text-2xl text-[#2d3a22] leading-tight tracking-[-0.5px]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            perfect day <span className="italic text-[#5a7a3a]">for a walk</span>
          </h3>
          <p className="mt-2 text-xs text-[#6b7560]">근처 산책로·카페·동물병원을 한눈에 보세요</p>
          <div className="mt-4 flex gap-3">
            <div className="flex-1 bg-white/60 rounded-2xl px-4 py-3">
              <p className="text-lg text-[#2d3a22]" style={{ fontFamily: "'DM Serif Display', serif" }}>23°C</p>
              <p className="text-[10px] text-[#6b7560] uppercase tracking-wider mt-0.5">맑음</p>
            </div>
            <div className="flex-1 bg-white/60 rounded-2xl px-4 py-3">
              <p className="text-lg text-[#2d3a22]" style={{ fontFamily: "'DM Serif Display', serif" }}>4 spots</p>
              <p className="text-[10px] text-[#6b7560] uppercase tracking-wider mt-0.5">추천 장소</p>
            </div>
          </div>
        </section>
      </Link>

      {/* 자유게시판 미리보기 */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl text-[#2d3a22] tracking-[-0.5px]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            recent <span className="italic text-[#5a7a3a]">posts</span>
          </h2>
          <Link href="/community" className="text-xs text-[#5a7a3a] font-semibold hover:underline">view all →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { emoji: '🐶', title: '강아지와 산책하기 좋은 계절이에요!', author: '멍멍이맘', time: '방금 전' },
            { emoji: '🐱', title: '고양이 사료 추천 받아요', author: '냥이집사', time: '5분 전' },
            { emoji: '🐹', title: '햄스터 케이지 청소 팁 공유해요', author: '햄찌아빠', time: '12분 전' },
            { emoji: '🐰', title: '토끼 건강검진 다녀왔어요', author: '토끼엄마', time: '30분 전' },
          ].map((post, i) => (
            <Link
              key={i}
              href="/community"
              className="backdrop-blur-xl bg-white/65 border border-white/50 rounded-2xl p-4 hover:bg-white/80 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e8f3d0] flex items-center justify-center flex-shrink-0 text-lg">
                  {post.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2d3a22] truncate">{post.title}</p>
                  <p className="text-xs text-[#6b7560] mt-1">{post.author} · {post.time}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 산책로 배너 */}
      <section className="mt-8">
        <Link
          href="/map"
          className="block bg-gradient-to-br from-[#b8d990] to-[#d4e8b0] rounded-3xl p-7 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#5a7a3a] tracking-[2px] uppercase font-semibold mb-2">— explore —</p>
              <h3 className="text-xl text-[#2d3a22] tracking-[-0.5px]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                find your favorite spot
              </h3>
              <p className="text-xs text-[#2d3a22]/70 mt-1">근처 산책로·도그카페·동물병원</p>
            </div>
            <Footprints size={32} className="text-[#5a7a3a]" />
          </div>
        </Link>
      </section>
    </div>
  )
}
