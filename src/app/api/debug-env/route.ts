import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    KAKAO_REST_API_KEY: !!process.env.KAKAO_REST_API_KEY,
    KAKAO_KEY_LEN: process.env.KAKAO_REST_API_KEY?.length ?? 0,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    NAVER_CLIENT_ID: !!process.env.NAVER_CLIENT_ID,
    NEXT_PUBLIC_NAVER_CLIENT_ID: !!process.env.NEXT_PUBLIC_NAVER_CLIENT_ID,
    NAVER_CLIENT_SECRET: !!process.env.NAVER_CLIENT_SECRET,
  })
}
