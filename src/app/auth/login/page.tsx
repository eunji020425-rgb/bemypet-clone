'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    } else {
      router.push('/')
      router.refresh()
    }
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🐾</div>
          <h1 className="text-xl font-bold text-[#2d2d2d]">로그인</h1>
          <p className="text-xs text-[#aaa] mt-1">Bemypet에 오신 것을 환영합니다</p>
        </div>

        {/* 구글 로그인 */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 border border-[#ececec] rounded-xl py-3 text-sm font-medium text-[#444] hover:bg-gray-50 transition mb-4"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.5 35.5 26.9 36 24 36c-5.2 0-9.6-3-11.3-7.3l-6.5 5C9.5 39.6 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.2 5.2C41 35.3 44 30 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          Google로 로그인
        </button>

        <div className="flex items-center gap-2 my-4">
          <hr className="flex-1 border-[#ececec]" />
          <span className="text-xs text-[#bbb]">또는</span>
          <hr className="flex-1 border-[#ececec]" />
        </div>

        {/* 이메일 로그인 폼 */}
        <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border border-[#ececec] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#f5c518]"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full border border-[#ececec] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#f5c518]"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#f5c518] hover:bg-[#e0b010] text-white font-bold py-3 rounded-xl text-sm transition disabled:opacity-60"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-xs text-[#aaa] mt-5">
          계정이 없으신가요?{' '}
          <Link href="/auth/signup" className="text-[#f5c518] font-bold hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
