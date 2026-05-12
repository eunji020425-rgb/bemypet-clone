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
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/65 border-b border-white/50">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        {/* 로고 */}
        <Link href="/" className="text-2xl tracking-tight" style={{ fontFamily: "'DM Serif Display', serif", letterSpacing: '-0.5px' }}>
          <span className="text-[#2d3a22]">pet</span><span className="italic text-[#5a7a3a]">together</span>
        </Link>

        {/* 데스크탑 메뉴 */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#2d3a22]">
          <Link href="/map" className="hover:text-[#5a7a3a] transition-colors flex items-center gap-1.5 text-[#5a7a3a] font-semibold"><MapIcon size={14}/>지도</Link>
          <Link href="/" className="hover:text-[#5a7a3a] transition-colors">홈</Link>
          <Link href="/community" className="hover:text-[#5a7a3a] transition-colors">커뮤니티</Link>
          <Link href="/chat" className="hover:text-[#5a7a3a] transition-colors">실시간채팅</Link>
          <Link href="/ai-doctor" className="hover:text-[#5a7a3a] transition-colors flex items-center gap-1.5"><Stethoscope size={14}/>AI닥터</Link>
          {isAdmin && (
            <Link href="/admin" className="text-[#a86570] hover:text-[#a86570]/80 transition-colors flex items-center gap-1.5 font-semibold">
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
                className="hidden md:flex items-center gap-1.5 bg-[#2d3a22] hover:bg-[#1a2310] text-[#fdfaf0] text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
              >
                <PenSquare size={14} />
                글쓰기
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-[#6b7560] hover:text-[#2d3a22] px-3 py-2 transition-colors"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm font-medium text-[#2d3a22] hover:text-[#5a7a3a] px-3 py-2 transition-colors"
            >
              로그인
            </Link>
          )}
          <button
            className="md:hidden p-2 text-[#2d3a22]"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {menuOpen && (
        <div className="md:hidden backdrop-blur-xl bg-white/80 border-t border-white/50 px-5 py-4 flex flex-col gap-4 text-sm font-medium text-[#2d3a22]">
          <Link href="/map" onClick={() => setMenuOpen(false)} className="text-[#5a7a3a] font-semibold">🗺️ 통합 지도</Link>
          <Link href="/" onClick={() => setMenuOpen(false)}>홈</Link>
          <Link href="/community" onClick={() => setMenuOpen(false)}>커뮤니티</Link>
          <Link href="/chat" onClick={() => setMenuOpen(false)}>실시간채팅</Link>
          <Link href="/ai-doctor" onClick={() => setMenuOpen(false)}>AI닥터</Link>
          {isAdmin && (
            <Link href="/admin" onClick={() => setMenuOpen(false)} className="text-[#a86570] font-semibold">
              🛡️ 관리자 페이지
            </Link>
          )}
          {user && (
            <Link href="/community/write" onClick={() => setMenuOpen(false)} className="text-[#5a7a3a] font-semibold">
              ✎ 글쓰기
            </Link>
          )}
        </div>
      )}
    </header>
  )
}
