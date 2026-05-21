'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { Menu, X, Shield, Bell, LogOut } from 'lucide-react'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
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
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
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

      {/* 햄버거 메뉴 (열렸을 때) */}
      {menuOpen && (
        <div className="absolute top-full inset-x-0 bg-white border-b border-[#e6effc] shadow-lg">
          <nav className="flex flex-col py-2 text-sm text-[#2a3a55]">
            <Link href="/" onClick={() => setMenuOpen(false)} className="px-5 py-2.5 hover:bg-[#f0f6ff]">🏠 홈</Link>
            <Link href="/map" onClick={() => setMenuOpen(false)} className="px-5 py-2.5 hover:bg-[#f0f6ff]">🗺️ 통합 지도</Link>
            <Link href="/walk" onClick={() => setMenuOpen(false)} className="px-5 py-2.5 hover:bg-[#f0f6ff]">🐾 산책</Link>
            <Link href="/community" onClick={() => setMenuOpen(false)} className="px-5 py-2.5 hover:bg-[#f0f6ff]">📝 커뮤니티</Link>
            <Link href="/chat" onClick={() => setMenuOpen(false)} className="px-5 py-2.5 hover:bg-[#f0f6ff]">💬 실시간채팅</Link>
            {user && (
              <Link href="/community/write" onClick={() => setMenuOpen(false)} className="px-5 py-2.5 text-[#3a7ab8] font-bold hover:bg-[#f0f6ff]">
                ✎ 글쓰기
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" onClick={() => setMenuOpen(false)} className="px-5 py-2.5 text-[#a86570] font-semibold hover:bg-[#fdf2f4]">
                <Shield size={14} className="inline mr-1.5" /> 관리자 페이지
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
