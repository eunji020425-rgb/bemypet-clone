'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Map, Footprints, Users, User } from 'lucide-react'

const TABS = [
  { href: '/',          label: '홈',     Icon: Home,       match: (p: string) => p === '/' },
  { href: '/map',       label: '지도',   Icon: Map,        match: (p: string) => p.startsWith('/map') },
  { href: '/walk',      label: '산책',   Icon: Footprints, match: (p: string) => p.startsWith('/walk') },
  { href: '/community', label: '커뮤니티', Icon: Users,    match: (p: string) => p.startsWith('/community') },
  { href: '/chat',      label: 'MY',     Icon: User,       match: (p: string) => p.startsWith('/chat') || p.startsWith('/auth') },
]

export default function BottomNav() {
  const pathname = usePathname() || '/'

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-[#d6e6ff]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-[480px] mx-auto h-14 grid grid-cols-5">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? 'text-[#3a7ab8]' : 'text-[#94a3b8] hover:text-[#3a7ab8]'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
