import Link from 'next/link'
import { MessageCircle, Users, Map as MapIcon, Footprints } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* 히어로 섹션 */}
      <section className="text-center py-12">
        <p className="text-xs text-[#3a7ab8] font-semibold tracking-[3px] uppercase">— welcome —</p>
        <h1 className="mt-4 text-[#2a3a55] leading-[1.15] tracking-[-1.5px]" style={{ fontSize: 'clamp(34px, 5.5vw, 52px)', fontWeight: 700 }}>
          너와 나를 위한<br/>
          <span className="text-[#3a7ab8]">평온한 공간</span>
        </h1>
        <p className="mt-6 text-[#6a7c95] text-sm leading-relaxed max-w-md mx-auto">
          반려동물과 함께하는 모든 순간을<br/>
          한 곳에 자연스럽게 담아 보세요
        </p>

        {/* 통합 검색 */}
        <div className="mt-8 max-w-md mx-auto relative">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#5a9de0]">🔍</span>
          <input
            type="text"
            placeholder="장소, 병원, 카페 검색"
            className="w-full backdrop-blur-xl bg-white/65 border border-white/50 rounded-full pl-12 pr-5 py-3.5 text-sm outline-none text-[#2a3a55] placeholder:text-[#6a7c95]"
          />
        </div>

        {/* 빠른 액션 */}
        <div className="flex justify-center gap-3 mt-8 flex-wrap">
          <Link href="/map" className="group">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-[#d6e6ff] flex items-center justify-center group-hover:scale-105 transition-transform border border-white/50">
                <MapIcon size={22} className="text-[#3a7ab8]" />
              </div>
              <span className="text-xs text-[#2a3a55] font-medium">지도</span>
            </div>
          </Link>
          <Link href="/walk" className="group">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-[#b8d3f5] flex items-center justify-center group-hover:scale-105 transition-transform border border-white/50">
                <Footprints size={22} className="text-[#3a7ab8]" />
              </div>
              <span className="text-xs text-[#2a3a55] font-medium">산책</span>
            </div>
          </Link>
          <Link href="/community" className="group">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-[#eaf2ff] flex items-center justify-center group-hover:scale-105 transition-transform border border-white/50">
                <Users size={22} className="text-[#5a9de0]" />
              </div>
              <span className="text-xs text-[#2a3a55] font-medium">커뮤니티</span>
            </div>
          </Link>
          <Link href="/chat" className="group">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-[#b8d3f5] flex items-center justify-center group-hover:scale-105 transition-transform border border-white/50">
                <MessageCircle size={22} className="text-[#3a7ab8]" />
              </div>
              <span className="text-xs text-[#2a3a55] font-medium">실시간채팅</span>
            </div>
          </Link>
        </div>
      </section>

      {/* 메인 카드 - 통합 지도 추천 */}
      <Link href="/walk" className="block">
        <section className="mt-6 backdrop-blur-xl bg-white/65 border border-white/50 rounded-3xl p-7 hover:bg-white/75 transition-colors">
          <p className="text-[11px] text-[#3a7ab8] tracking-[2px] font-semibold">— 오늘 —</p>
          <h3 className="mt-2 text-2xl text-[#2a3a55] leading-tight tracking-[-0.5px] font-bold">
            산책하기 <span className="text-[#3a7ab8]">좋은 날</span>
          </h3>
          <p className="mt-2 text-xs text-[#6a7c95]">근처 산책로·카페·동물병원을 한눈에 보세요</p>
          <div className="mt-4 flex gap-3">
            <div className="flex-1 bg-white/60 rounded-2xl px-4 py-3">
              <p className="text-lg text-[#2a3a55] font-bold">23°C</p>
              <p className="text-[11px] text-[#6a7c95] tracking-wider mt-0.5">맑음</p>
            </div>
            <div className="flex-1 bg-white/60 rounded-2xl px-4 py-3">
              <p className="text-lg text-[#2a3a55] font-bold">4곳</p>
              <p className="text-[11px] text-[#6a7c95] tracking-wider mt-0.5">추천 장소</p>
            </div>
          </div>
        </section>
      </Link>

      {/* 자유게시판 미리보기 */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl text-[#2a3a55] tracking-[-0.5px] font-bold">
            최근 <span className="text-[#3a7ab8]">게시글</span>
          </h2>
          <Link href="/community" className="text-xs text-[#3a7ab8] font-semibold hover:underline">전체보기 →</Link>
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
                <div className="w-10 h-10 rounded-xl bg-[#d6e6ff] flex items-center justify-center flex-shrink-0 text-lg">
                  {post.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2a3a55] truncate">{post.title}</p>
                  <p className="text-xs text-[#6a7c95] mt-1">{post.author} · {post.time}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 산책로 배너 */}
      <section className="mt-8">
        <Link
          href="/walk"
          className="block bg-gradient-to-br from-[#8fb8e8] to-[#b8d3f5] rounded-3xl p-7 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#3a7ab8] tracking-[2px] font-semibold mb-2">— 둘러보기 —</p>
              <h3 className="text-xl text-[#2a3a55] tracking-[-0.5px] font-bold">
                우리만의 산책 코스 찾기
              </h3>
              <p className="text-xs text-[#2a3a55]/70 mt-1">근처 산책로 · 반려동물 동반 장소 · 동물병원</p>
            </div>
            <Footprints size={32} className="text-[#3a7ab8]" />
          </div>
        </Link>
      </section>
    </div>
  )
}
