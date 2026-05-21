export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { User, Footprints, MessageSquare, Heart, Shield, TrendingUp, LogIn, ChevronRight } from 'lucide-react'
import LogoutButton from './LogoutButton'
import EditNickname from './EditNickname'

function fmtDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`
  return `${(m / 1000).toFixed(2)}km`
}

function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}시간 ${m}분`
  return `${m}분`
}

export default async function MyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="px-4 py-10">
        <div className="bg-white rounded-3xl border border-[#e6effc] p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#f0f6ff] flex items-center justify-center mb-4">
            <User size={28} className="text-[#3a7ab8]" />
          </div>
          <h1 className="text-lg font-bold text-[#2a3a55] mb-1">로그인이 필요해요</h1>
          <p className="text-xs text-[#94a3b8] mb-6">
            산책 기록과 내 게시글을 보려면 로그인해 주세요
          </p>
          <Link
            href={`/auth/login?next=${encodeURIComponent('/my')}`}
            className="inline-flex items-center gap-2 bg-[#3a7ab8] hover:bg-[#1a2a3f] text-white text-sm font-bold px-6 py-3 rounded-full transition"
          >
            <LogIn size={16} /> 로그인 / 회원가입
          </Link>
        </div>
      </div>
    )
  }

  // 프로필
  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, email, avatar_url, is_admin, created_at')
    .eq('id', user.id)
    .maybeSingle()

  // 산책 통계
  const { data: walks } = await supabase
    .from('walk_sessions')
    .select('duration_s, distance_m, ended_at')
    .eq('user_id', user.id)

  const finished = (walks ?? []).filter(w => w.ended_at)
  const walkCount = finished.length
  const totalSec = finished.reduce((s, w) => s + (w.duration_s ?? 0), 0)
  const totalDist = finished.reduce((s, w) => s + (w.distance_m ?? 0), 0)

  // 내 게시글 수
  const { count: postCount } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // 내가 좋아요 한 글 수
  const { count: likeCount } = await supabase
    .from('post_likes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const nickname = profile?.nickname ?? user.email?.split('@')[0] ?? '익명'
  const email = profile?.email ?? user.email ?? ''
  const avatarLetter = nickname.charAt(0).toUpperCase()

  return (
    <div className="px-4 py-6 space-y-4">
      {/* 프로필 카드 */}
      <section className="bg-white rounded-3xl border border-[#e6effc] p-5">
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={nickname} className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#5a9de0] to-[#3a7ab8] flex items-center justify-center text-white text-xl font-bold">
              {avatarLetter}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-[#2a3a55] truncate">{nickname}</p>
            <p className="text-xs text-[#94a3b8] truncate">{email}</p>
          </div>
          <EditNickname currentNickname={nickname} />
        </div>
      </section>

      {/* 산책 통계 */}
      <section className="bg-white rounded-3xl border border-[#e6effc] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Footprints size={16} className="text-[#3a7ab8]" />
          <h2 className="text-sm font-bold text-[#2a3a55]">산책 통계</h2>
          <Link href="/walk/history" className="ml-auto text-xs text-[#3a7ab8] hover:underline">전체 →</Link>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-[#f0f6ff] rounded-2xl py-3">
            <p className="text-xs text-[#6a7c95]">총 횟수</p>
            <p className="text-lg font-bold text-[#3a7ab8] mt-1">{walkCount}<span className="text-xs font-normal text-[#94a3b8]">회</span></p>
          </div>
          <div className="bg-[#f0fdf4] rounded-2xl py-3">
            <p className="text-xs text-[#6a7c95]">총 거리</p>
            <p className="text-lg font-bold text-[#22c55e] mt-1">{fmtDistance(totalDist)}</p>
          </div>
          <div className="bg-[#fef3c7] rounded-2xl py-3">
            <p className="text-xs text-[#6a7c95]">총 시간</p>
            <p className="text-lg font-bold text-[#d97706] mt-1">{fmtDuration(totalSec)}</p>
          </div>
        </div>
      </section>

      {/* 내 활동 */}
      <section className="bg-white rounded-3xl border border-[#e6effc] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#e6effc]">
          <h2 className="text-sm font-bold text-[#2a3a55]">내 활동</h2>
        </div>
        <Link href="/community?author=me" className="px-5 py-3.5 flex items-center gap-3 hover:bg-[#f8fbff] border-b border-[#e6effc]">
          <div className="w-9 h-9 rounded-full bg-[#d6e6ff] flex items-center justify-center">
            <MessageSquare size={16} className="text-[#3a7ab8]" />
          </div>
          <span className="text-sm text-[#2a3a55] flex-1">내가 쓴 글</span>
          <span className="text-xs text-[#94a3b8]">{postCount ?? 0}개</span>
          <ChevronRight size={16} className="text-[#cbd5e1]" />
        </Link>
        <Link href="/community" className="px-5 py-3.5 flex items-center gap-3 hover:bg-[#f8fbff] border-b border-[#e6effc]">
          <div className="w-9 h-9 rounded-full bg-[#fee2e2] flex items-center justify-center">
            <Heart size={16} className="text-[#ef4444]" />
          </div>
          <span className="text-sm text-[#2a3a55] flex-1">좋아요한 글</span>
          <span className="text-xs text-[#94a3b8]">{likeCount ?? 0}개</span>
          <ChevronRight size={16} className="text-[#cbd5e1]" />
        </Link>
        <Link href="/walk/history" className="px-5 py-3.5 flex items-center gap-3 hover:bg-[#f8fbff]">
          <div className="w-9 h-9 rounded-full bg-[#dcfce7] flex items-center justify-center">
            <TrendingUp size={16} className="text-[#22c55e]" />
          </div>
          <span className="text-sm text-[#2a3a55] flex-1">산책 이력</span>
          <span className="text-xs text-[#94a3b8]">{walkCount}개</span>
          <ChevronRight size={16} className="text-[#cbd5e1]" />
        </Link>
      </section>

      {/* 관리자 */}
      {profile?.is_admin && (
        <section className="bg-white rounded-3xl border border-[#fecaca] overflow-hidden">
          <Link href="/admin" className="px-5 py-3.5 flex items-center gap-3 hover:bg-[#fef2f2]">
            <div className="w-9 h-9 rounded-full bg-[#fee2e2] flex items-center justify-center">
              <Shield size={16} className="text-[#a86570]" />
            </div>
            <span className="text-sm text-[#a86570] font-bold flex-1">관리자 페이지</span>
            <ChevronRight size={16} className="text-[#cbd5e1]" />
          </Link>
        </section>
      )}

      {/* 로그아웃 */}
      <section className="pt-2">
        <LogoutButton />
      </section>

      <p className="text-center text-[10px] text-[#cbd5e1] pt-4">
        가입일 {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ko-KR') : '-'}
      </p>
    </div>
  )
}
