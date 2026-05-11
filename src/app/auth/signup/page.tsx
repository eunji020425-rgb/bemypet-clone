'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname } },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-lg font-bold text-[#2d2d2d] mb-2">이메일을 확인해주세요!</h2>
          <p className="text-sm text-[#888] mb-6">
            <strong>{email}</strong>로 인증 메일을 보냈습니다.<br />
            메일함을 확인해 인증을 완료해주세요.
          </p>
          <Link href="/auth/login" className="text-[#f5c518] font-bold text-sm hover:underline">
            로그인 페이지로 →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🐾</div>
          <h1 className="text-xl font-bold text-[#2d2d2d]">회원가입</h1>
          <p className="text-xs text-[#aaa] mt-1">Bemypet과 함께 시작하세요</p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="닉네임"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            required
            className="w-full border border-[#ececec] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#f5c518]"
          />
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
            placeholder="비밀번호 (6자 이상)"
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
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p className="text-center text-xs text-[#aaa] mt-5">
          이미 계정이 있으신가요?{' '}
          <Link href="/auth/login" className="text-[#f5c518] font-bold hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
