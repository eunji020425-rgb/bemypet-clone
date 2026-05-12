'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { PenSquare, Menu, X, Stethoscope, MapPin, Footprints, PawPrint, Map as MapIcon, Shield } from 'lucide-react'

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
    <header className="sticky top-0 z-50 bg-white border-b border-[#ececec] shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* 로고 */}
        <Link href="/" className="font-bold text-xl tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
          <span className="text-[#f5c518]">Pet</span><span className="text-[#2d2d2d]">Together</span>
        </Link>

        {/* 데스크탑 메뉴 */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-[#444]">
          <Link href="/map" className="hover:text-[#f5c518] transition-colors flex items-center gap-1 font-bold text-[#f5c518]"><MapIcon size={14}/>지도</Link>
          <Link href="/" className="hover:text-[#f5c518] transition-colors">홈</Link>
          <Link href="/community" className="hover:text-[#f5c518] transition-colors">커뮤니티</Link>
          <Link href="/chat" className="hover:text-[#f5c518] transition-colors">실시간채팅</Link>
          <Link href="/ai-doctor" className="hover:text-[#f5c518] transition-colors flex items-center gap-1"><Stethoscope size={14}/>AI닥터</Link>
          {isAdmin && (
            <Link href="/admin" className="text-red-500 hover:text-red-600 transition-colors flex items-center gap-1 font-bold">
              <Shield size={14}/>관리자
            </Link>
          )}
        </nav>

        {/* 우측 버튼 영역 */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/community/write"
                className="hidden md:flex items-center gap-1 bg-[#f5c518] hover:bg-[#e0b010] text-white text-sm font-bold px-4 py-2 rounded-full transition-colors"
              >
                <PenSquare size={15} />
                글쓰기
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-[#888] hover:text-[#2d2d2d] px-3 py-2 transition-colors"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm font-medium text-[#444] hover:text-[#f5c518] px-3 py-2 transition-colors"
            >
              로그인
            </Link>
          )}
          <button
            className="md:hidden p-2 text-[#444]"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-[#ececec] px-4 py-3 flex flex-col gap-3 text-sm font-medium text-[#444]">
          <Link href="/map" onClick={() => setMenuOpen(false)} className="text-[#f5c518] font-bold">🗺️ 통합 지도</Link>
          <Link href="/" onClick={() => setMenuOpen(false)}>홈</Link>
          <Link href="/community" onClick={() => setMenuOpen(false)}>커뮤니티</Link>
          <Link href="/chat" onClick={() => setMenuOpen(false)}>실시간채팅</Link>
          <Link href="/ai-doctor" onClick={() => setMenuOpen(false)}>AI닥터</Link>
          {isAdmin && (
            <Link href="/admin" onClick={() => setMenuOpen(false)} className="text-red-500 font-bold">
              🛡️ 관리자 페이지
            </Link>
          )}
          {user && (
            <Link href="/community/write" onClick={() => setMenuOpen(false)} className="text-[#f5c518] font-bold">
              글쓰기
            </Link>
          )}
        </div>
      )}
    </header>
  )
}
