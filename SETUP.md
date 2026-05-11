# Bemypet Clone - 설정 가이드

## 1. Supabase 프로젝트 생성

1. https://supabase.com 접속 → 새 프로젝트 생성
2. `supabase/schema.sql` 파일 내용을 **SQL Editor**에 붙여넣고 실행
3. **Authentication > Providers** 에서 **Google** 활성화
   - Google Cloud Console에서 OAuth 클라이언트 ID/Secret 발급 필요
   - Redirect URL: `https://[your-project].supabase.co/auth/v1/callback`
4. **Project Settings > API** 에서 URL과 anon key 복사

## 2. 환경변수 설정

`.env.local` 파일을 열어 실제 값으로 교체:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. 로컬 개발 실행

```bash
npm run dev
```
→ http://localhost:3000 에서 확인

## 4. Vercel 배포

```bash
# GitHub 저장소에 push 후 Vercel에 연결
# Vercel 대시보드 > Environment Variables에 .env.local 내용 추가
```

## 5. Capacitor 모바일 앱 (선택)

Vercel 배포 후 `capacitor.config.ts`에서:
```ts
server: {
  url: 'https://your-vercel-domain.vercel.app',
}
```
으로 설정한 뒤:

```bash
npx cap add android   # 또는 ios
npx cap sync
npx cap open android  # Android Studio로 열기
```

## 주요 기능

| 기능 | 경로 |
|------|------|
| 홈 | `/` |
| 로그인 | `/auth/login` |
| 회원가입 | `/auth/signup` |
| 자유게시판 | `/community` |
| 글쓰기 | `/community/write` |
| 실시간 채팅 | `/chat` |
