'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { Menu, X, Shield, Bell, LogOut } from 'lucide-react'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const router = useRouter()
  const supabase = createClient()

  const checkAdmin = async (u: User | null) => {
    if (!u) { setIsAdmin(false); return }
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', u.id)
      .single()
    setIsAdmin(!!data?.is_admin)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      checkAdmin(data.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      checkAdmin(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      // 로컬 스토리지의 supabase 키도 정리 (모바일 잔존 방지)
      if (typeof window !== 'undefined') {
        Object.keys(localStorage)
          .filter(k => k.startsWith('sb-') && k.includes('auth-token'))
          .forEach(k => localStorage.removeItem(k))
      }
    } finally {
      setUser(null)
      setIsAdmin(false)
      router.push('/')
      router.refresh()
    }
  }

  return (
    <>
    <header
      className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#e6effc]"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="px-4 h-12 flex items-center justify-between">
        {/* 좌측 햄버거 */}
        <button
          className="p-1.5 -ml-1.5 text-[#2a3a55] hover:text-[#3a7ab8]"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* 로고 (가운데) */}
        <Link
          href="/"
          className="text-lg tracking-tight"
          style={{ fontFamily: "'DM Serif Display', serif", letterSpacing: '-0.5px' }}
        >
          <span className="text-[#2a3a55]">pet</span>
          <span className="italic text-[#3a7ab8]">together</span>
        </Link>

        {/* 우측: 알림 + 로그인/아웃 */}
        <div className="flex items-center gap-1">
          <button className="p-1.5 text-[#94a3b8] hover:text-[#3a7ab8]" aria-label="notifications">
            <Bell size={18} />
          </button>
          {user ? (
            <button
              onClick={handleLogout}
              className="p-1.5 text-[#94a3b8] hover:text-[#ef4444]"
              aria-label="logout"
              title="로그아웃"
            >
              <LogOut size={18} />
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="text-xs font-bold text-[#3a7ab8] px-2 py-1"
            >
              로그인
            </Link>
          )}
        </div>
      </div>

    </header>

    {/* 사이드 드로어 - body로 portal해서 stacking context 우회 */}
    {menuOpen && mounted && createPortal(
      <>
        {/* 어두운 오버레이 (Leaflet 팬 z-index 700보다 높게) */}
        <div
          className="fixed inset-0 bg-black/40 animate-in fade-in duration-200"
          style={{ zIndex: 9998 }}
          onClick={() => setMenuOpen(false)}
        />
        {/* 왼쪽에서 슬라이드 인 */}
        <aside
          className="fixed top-0 left-0 bottom-0 w-72 max-w-[80vw] bg-white shadow-2xl flex flex-col"
          style={{ zIndex: 9999, animation: 'slideInLeft 0.25s ease-out', paddingTop: 'env(safe-area-inset-top)' }}
        >
          {/* 드로어 헤더 */}
          <div className="h-12 px-4 flex items-center justify-between border-b border-[#e6effc]">
            <span className="text-base font-bold text-[#2a3a55]" style={{ fontFamily: "'DM Serif Display', serif" }}>
              메뉴
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-1.5 -mr-1.5 text-[#94a3b8] hover:text-[#2a3a55]"
              aria-label="close"
            >
              <X size={20} />
            </button>
          </div>

          {/* 메뉴 항목 */}
          <nav className="flex flex-col py-2 text-sm text-[#2a3a55] flex-1 overflow-y-auto">
            <Link href="/" onClick={() => setMenuOpen(false)} className="px-5 py-3 hover:bg-[#f0f6ff] flex items-center gap-3">
              <span className="text-lg">🏠</span> 홈
            </Link>
            <Link href="/map" onClick={() => setMenuOpen(false)} className="px-5 py-3 hover:bg-[#f0f6ff] flex items-center gap-3">
              <span className="text-lg">🗺️</span> 통합 지도
            </Link>
            <Link href="/walk" onClick={() => setMenuOpen(false)} className="px-5 py-3 hover:bg-[#f0f6ff] flex items-center gap-3">
              <span className="text-lg">🐾</span> 산책
            </Link>
            <Link href="/community" onClick={() => setMenuOpen(false)} className="px-5 py-3 hover:bg-[#f0f6ff] flex items-center gap-3">
              <span className="text-lg">📝</span> 커뮤니티
            </Link>
            <Link href="/chat" onClick={() => setMenuOpen(false)} className="px-5 py-3 hover:bg-[#f0f6ff] flex items-center gap-3">
              <span className="text-lg">💬</span> 실시간채팅
            </Link>
            {user && (
              <Link href="/community/write" onClick={() => setMenuOpen(false)} className="px-5 py-3 text-[#3a7ab8] font-bold hover:bg-[#f0f6ff] flex items-center gap-3">
                <span className="text-lg">✎</span> 글쓰기
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" onClick={() => setMenuOpen(false)} className="px-5 py-3 text-[#a86570] font-semibold hover:bg-[#fdf2f4] flex items-center gap-3 border-t border-[#e6effc] mt-2 pt-3">
                <Shield size={16} /> 관리자 페이지
              </Link>
            )}
          </nav>

          {/* 드로어 푸터 - 로그인 상태 */}
          <div className="border-t border-[#e6effc] p-4">
            {user ? (
              <button
                onClick={() => { setMenuOpen(false); handleLogout() }}
                className="w-full flex items-center justify-center gap-2 bg-[#f0f6ff] hover:bg-[#e6effc] text-[#6a7c95] text-sm py-2.5 rounded-full transition"
              >
                <LogOut size={14} /> 로그아웃
              </button>
            ) : (
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center justify-center bg-[#3a7ab8] hover:bg-[#1a2a3f] text-white text-sm font-bold py-2.5 rounded-full transition"
              >
                로그인 / 회원가입
              </Link>
            )}
          </div>
        </aside>

        <style>{`
          @keyframes slideInLeft {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
        `}</style>
      </>,
      document.body
    )}
    </>
  )
}
