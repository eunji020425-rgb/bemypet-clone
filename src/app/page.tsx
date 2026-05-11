import Link from 'next/link'
import { MessageCircle, PenSquare, Users } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* 히어로 섹션 */}
      <section className="text-center py-12">
        <p className="text-sm text-[#888] mb-2">우리 아이의 시간을 더 행복하게 🐾</p>
        <div className="text-6xl mb-4">🐱🐶</div>
        <h1 className="text-3xl font-bold text-[#2d2d2d] mb-4">
          반려동물 커뮤니티, <span className="text-[#f5c518]">Bemypet</span>
        </h1>
        <p className="text-[#666] mb-8 text-base">
          자유게시판에서 이야기 나누고, 실시간 채팅으로 소통하세요.
        </p>

        {/* 통합 검색창 */}
        <div className="max-w-xl mx-auto relative mb-10">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bbb] text-sm">🔍</span>
          <input
            type="text"
            placeholder="통합 검색"
            className="w-full border-2 border-[#f5c518] rounded-full px-6 pl-10 py-3 text-sm outline-none bg-white shadow-sm"
          />
        </div>

        {/* 바로가기 아이콘 */}
        <div className="flex justify-center gap-6">
          <Link href="/community" className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-full bg-[#f5e97a] flex items-center justify-center group-hover:scale-105 transition-transform shadow">
              <Users size={24} className="text-[#7a6a00]" />
            </div>
            <span className="text-xs text-[#555]">커뮤니티</span>
          </Link>
          <Link href="/chat" className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-full bg-[#d4f0ff] flex items-center justify-center group-hover:scale-105 transition-transform shadow">
              <MessageCircle size={24} className="text-[#1a7fa0]" />
            </div>
            <span className="text-xs text-[#555]">실시간채팅</span>
          </Link>
          <Link href="/community/write" className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-full bg-[#ffd6d6] flex items-center justify-center group-hover:scale-105 transition-transform shadow">
              <PenSquare size={24} className="text-[#c04040]" />
            </div>
            <span className="text-xs text-[#555]">글쓰기</span>
          </Link>
        </div>
      </section>

      <hr className="border-[#ececec] my-8" />

      {/* 자유게시판 미리보기 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#2d2d2d]">자유게시판</h2>
          <Link href="/community" className="text-xs text-[#888] hover:text-[#f5c518]">전체보기 →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { emoji: '🐶', title: '강아지와 산책하기 좋은 계절이에요!', author: '멍멍이맘', time: '방금 전' },
            { emoji: '🐱', title: '고양이 사료 추천 받아요', author: '냥이집사', time: '5분 전' },
            { emoji: '🐹', title: '햄스터 케이지 청소 팁 공유해요', author: '햄찌아빠', time: '12분 전' },
            { emoji: '🐰', title: '토끼 건강검진 다녀왔어요 🏥', author: '토끼엄마', time: '30분 전' },
          ].map((post, i) => (
            <Link
              key={i}
              href="/community"
              className="bg-white rounded-2xl p-4 shadow-sm border border-[#ececec] hover:border-[#f5c518] transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{post.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2d2d2d] truncate">{post.title}</p>
                  <p className="text-xs text-[#aaa] mt-1">{post.author} · {post.time}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 실시간채팅 배너 */}
      <section className="mt-8">
        <Link
          href="/chat"
          className="block bg-gradient-to-r from-[#f5c518] to-[#f5e07a] rounded-2xl p-6 shadow hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#7a5f00] mb-1">💬 실시간 채팅방</p>
              <p className="text-xs text-[#7a6000]">지금 반려동물 친구들과 실시간으로 대화해보세요!</p>
            </div>
            <span className="text-2xl">→</span>
          </div>
        </Link>
      </section>
    </div>
  )
}
