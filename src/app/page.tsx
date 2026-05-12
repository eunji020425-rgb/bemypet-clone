import Link from 'next/link'
import { MessageCircle, Users, Map as MapIcon, Stethoscope, Footprints, Search } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 relative">

      {/* 히어로: 포스터 헤드라인 */}
      <section className="text-center pt-6 pb-10 relative">
        <p className="text-[#2d6b2d] tracking-[6px] text-sm">— WELCOME —</p>
        <p className="mt-3 text-[#5a8a4a] text-xs tracking-[2px]">(C) PET TOGETHER · 반려동물과 함께</p>

        <h1 className="mt-4 text-[#2d6b2d] leading-[1.05]" style={{ fontSize: 'clamp(44px, 8vw, 78px)', textShadow: '3px 3px 0 #fef3a8' }}>
          멍냥이랑<span className="inline-block align-middle mx-2">🍀</span>
          <br/>
          <span className="fill-green">함께가게</span>
        </h1>

        <p className="mt-4 text-[#2d6b2d] tracking-[2px] text-xs">PET TOGETHER · DAILY MOMENTS WITH YOUR PET</p>

        {/* 정보 박스 - 럭키캣 ODD 스타일 */}
        <div className="mt-8 max-w-lg mx-auto lucky-card p-5 text-left">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-2xl text-[#2d6b2d]">PET</span>
            <span className="text-[#5a8a4a] text-sm">서울 마포구 어디든지 우리집</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#5a8a4a] tracking-wider">
            <span>DATE & TIME</span>
            <span className="text-[#2d6b2d]">매일 24시간 · 언제든</span>
          </div>
        </div>

        {/* 검색바 */}
        <div className="mt-5 max-w-lg mx-auto relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#6fb83f]" size={18} />
          <input
            type="text"
            placeholder="장소, 병원, 카페 검색"
            className="w-full bg-white border-2 border-[#6fb83f] rounded-full pl-12 pr-5 py-3 text-sm outline-none text-[#2d6b2d] placeholder:text-[#95cc5c]"
          />
        </div>
      </section>

      {/* 특전 리스트 - 럭키캣 포스터 스타일 표 */}
      <section className="lucky-card overflow-hidden mb-10">
        <Link href="/map" className="flex items-stretch border-b-2 border-[#6fb83f] hover:bg-[#fef9c4] transition-colors">
          <div className="w-32 flex items-center justify-center text-[#2d6b2d] py-4 px-3 border-r-2 border-[#6fb83f]">
            <span className="text-sm">기본특전</span>
          </div>
          <div className="flex-1 px-5 py-4 flex items-center gap-2">
            <MapIcon size={18} className="text-[#6fb83f]" />
            <span className="text-[#2d6b2d] text-sm">지도 + 산책로 + 동물병원 + 애견동반</span>
          </div>
        </Link>
        <Link href="/community" className="flex items-stretch border-b-2 border-[#6fb83f] hover:bg-[#fef9c4] transition-colors">
          <div className="w-32 flex items-center justify-center text-[#2d6b2d] py-4 px-3 border-r-2 border-[#6fb83f]">
            <span className="text-sm">커뮤니티</span>
          </div>
          <div className="flex-1 px-5 py-4 flex items-center gap-2">
            <Users size={18} className="text-[#6fb83f]" />
            <span className="text-[#2d6b2d] text-sm">자유게시판 + 실시간 채팅</span>
          </div>
        </Link>
        <Link href="/ai-doctor" className="flex items-stretch hover:bg-[#fef9c4] transition-colors">
          <div className="w-32 flex items-center justify-center text-[#2d6b2d] py-4 px-3 border-r-2 border-[#6fb83f]">
            <span className="text-sm">AI 닥터</span>
          </div>
          <div className="flex-1 px-5 py-4 flex items-center gap-2">
            <Stethoscope size={18} className="text-[#6fb83f]" />
            <span className="text-[#2d6b2d] text-sm">반려동물 건강 상담 · 24시간</span>
          </div>
        </Link>
      </section>

      {/* 해시태그 이벤트 */}
      <section className="mb-10">
        <p className="text-[#2d6b2d] tracking-[3px] text-xs mb-3">HASHTAG EVENT</p>
        <div className="flex flex-col gap-2 items-start">
          <span className="lucky-chip">#오늘도_우리집_댕댕이</span>
          <span className="lucky-chip ml-6">#HBDTOMYLUCKYPET</span>
        </div>
      </section>

      {/* 최근 게시글 */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl text-[#2d6b2d]">RECENT <span className="fill-green">POSTS</span></h2>
          <Link href="/community" className="text-sm text-[#2d6b2d] hover:underline">view all →</Link>
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
              className="lucky-card p-4 hover:bg-[#fef9c4] transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#e8f5d0] border-2 border-[#6fb83f] flex items-center justify-center flex-shrink-0 text-lg">
                  {post.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#2d6b2d] truncate">{post.title}</p>
                  <p className="text-xs text-[#5a8a4a] mt-1">{post.author} · {post.time}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* NOTICE */}
      <section className="mb-10">
        <p className="text-[#2d6b2d] tracking-[3px] text-xs mb-3">NOTICE</p>
        <div className="text-sm text-[#5a8a4a] leading-relaxed space-y-1">
          <p>· 모든 기능은 회원가입 후 이용 가능합니다</p>
          <p>· AI 닥터 답변은 참고용이며, 정확한 진단은 동물병원에 문의해 주세요</p>
          <p>· 커뮤니티 운영 규정을 지켜 주세요</p>
          <p>· 문의는 @pettogether 로 부탁드립니다</p>
        </div>
      </section>

      {/* 산책 배너 */}
      <section className="mb-10">
        <Link href="/map" className="lucky-card p-6 flex items-center justify-between hover:bg-[#fef9c4] transition-colors">
          <div>
            <p className="text-xs text-[#2d6b2d] tracking-[3px] mb-2">— EXPLORE —</p>
            <h3 className="text-2xl text-[#2d6b2d]">find your <span className="fill-green">spot</span></h3>
            <p className="text-sm text-[#5a8a4a] mt-1">근처 산책로 · 도그카페 · 동물병원</p>
          </div>
          <Footprints size={48} className="text-[#6fb83f]" />
        </Link>
      </section>
    </div>
  )
}
