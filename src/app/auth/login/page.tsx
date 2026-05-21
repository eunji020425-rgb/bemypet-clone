'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="px-4 py-10 text-center text-sm text-[#94a3b8]">로딩 중...</div>}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const next = searchParams?.get('next') || '/'
  const urlError = searchParams?.get('error')

  // 이미 로그인 상태면 자동 리다이렉트
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace(next)
      }
    })
  }, [])

  useEffect(() => {
    if (urlError) setError(decodeURIComponent(urlError))
  }, [urlError])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      const msg = error.message?.toLowerCase() ?? ''
      if (msg.includes('invalid')) setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      else if (msg.includes('email not confirmed')) setError('이메일 인증이 완료되지 않았어요. 메일함을 확인해주세요.')
      else setError(error.message)
    } else {
      router.push(next)
      router.refresh()
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: {
          // 매번 구글 계정 선택 화면을 강제로 띄움 → 다른 사람이 본인 계정으로 자동 로그인 못 함
          prompt: 'select_account',
          access_type: 'offline',
        },
      },
    })
    if (error) {
      setError('구글 로그인을 시작할 수 없습니다. ' + error.message)
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-[#6a7c95] hover:text-[#2a3a55] mb-3">
        <ArrowLeft size={16} /> 뒤로
      </button>

      <div className="bg-white rounded-3xl shadow-sm border border-[#e6effc] p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🐾</div>
          <h1 className="text-xl font-bold text-[#2a3a55]">로그인</h1>
          <p className="text-xs text-[#94a3b8] mt-1">PetTogether에 오신 것을 환영합니다</p>
        </div>

        {/* 구글 로그인 */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 border border-[#d6e6ff] rounded-xl py-3 text-sm font-medium text-[#444] hover:bg-gray-50 transition mb-4 disabled:opacity-60"
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
          <hr className="flex-1 border-[#e6effc]" />
          <span className="text-xs text-[#94a3b8]">또는</span>
          <hr className="flex-1 border-[#e6effc]" />
        </div>

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            inputMode="email"
            className="w-full border border-[#d6e6ff] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#3a7ab8]"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full border border-[#d6e6ff] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#3a7ab8]"
          />
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3a7ab8] hover:bg-[#1a2a3f] text-white font-bold py-3 rounded-xl text-sm transition disabled:opacity-60"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-xs text-[#94a3b8] mt-5">
          계정이 없으신가요?{' '}
          <Link
            href={`/auth/signup${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="text-[#3a7ab8] font-bold hover:underline"
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
