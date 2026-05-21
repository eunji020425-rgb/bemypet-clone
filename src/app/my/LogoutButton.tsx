'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handle = async () => {
    if (!confirm('로그아웃 하시겠어요?')) return
    setLoading(true)
    try {
      await supabase.auth.signOut()
      if (typeof window !== 'undefined') {
        Object.keys(localStorage)
          .filter(k => k.startsWith('sb-') && k.includes('auth-token'))
          .forEach(k => localStorage.removeItem(k))
      }
    } finally {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 bg-white border border-[#e6effc] hover:bg-[#f8fbff] text-[#6a7c95] hover:text-[#ef4444] text-sm font-bold py-3 rounded-2xl transition disabled:opacity-60"
    >
      <LogOut size={16} />
      {loading ? '로그아웃 중...' : '로그아웃'}
    </button>
  )
}
