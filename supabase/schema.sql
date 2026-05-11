-- =============================================
-- Bemypet Clone - Supabase Schema
-- Supabase 대시보드 > SQL Editor에서 실행하세요
-- =============================================

-- 1. profiles 테이블 (auth.users와 연동)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nickname TEXT NOT NULL DEFAULT '익명',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 회원가입 시 자동으로 profiles 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. posts 테이블
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. post_likes 테이블
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 4. comments 테이블
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. chat_messages 테이블
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RLS (Row Level Security) 정책
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- profiles: 누구나 읽기, 본인만 수정
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- posts: 누구나 읽기, 로그인 사용자 작성, 본인만 수정/삭제
CREATE POLICY "posts_select" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "posts_delete" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- post_likes: 누구나 읽기, 로그인 사용자 작성/삭제
CREATE POLICY "likes_select" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "likes_insert" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- comments: 누구나 읽기, 로그인 사용자 작성, 본인만 삭제
CREATE POLICY "comments_select" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- chat_messages: 누구나 읽기, 로그인 사용자 작성
CREATE POLICY "chat_select" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "chat_insert" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Realtime 활성화 (chat_messages)
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- =============================================
-- Storage 버킷 생성 (이미지 업로드용)
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "images_select" ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "images_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');
