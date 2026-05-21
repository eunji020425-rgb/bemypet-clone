-- =============================================================
-- PetTogether 전체 스키마 재적용 (멱등성 보장)
-- 이미 있는 테이블/컬럼/정책은 건너뜀, 없는 것만 추가
-- Supabase 콘솔 → SQL Editor → New query → 전체 복사 → Run
-- =============================================================

-- ============== 1. 테이블 (CREATE IF NOT EXISTS) ==============

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nickname TEXT NOT NULL DEFAULT '익명',
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== 2. 누락 컬럼 보충 (멱등) ==============

ALTER TABLE public.posts          ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.posts          ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE public.posts          ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
ALTER TABLE public.posts          ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles       ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles       ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE public.profiles       ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles       ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles       ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 기존 다른 컬럼 (username/display_name)에서 nickname으로 복사 (값 비어있을 때만)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='profiles' AND column_name='display_name') THEN
    UPDATE public.profiles SET nickname = display_name WHERE nickname IS NULL AND display_name IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='profiles' AND column_name='username') THEN
    UPDATE public.profiles SET nickname = username WHERE nickname IS NULL AND username IS NOT NULL;
  END IF;
END $$;

UPDATE public.profiles SET nickname = '익명' WHERE nickname IS NULL;
ALTER TABLE public.comments       ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE public.comments       ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.chat_messages  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE public.chat_messages  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============== 3. 신규 가입 자동 profile 트리거 ==============

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'nickname',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1),
      '익명'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============== 4. 기존 auth.users 백필 ==============

INSERT INTO public.profiles (id, email, nickname)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'nickname',
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'full_name',
    split_part(u.email, '@', 1),
    '익명'
  )
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- ============== 5. RLS 활성화 ==============

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ============== 6. RLS 정책 (DROP + CREATE = 멱등) ==============

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "posts_select"    ON public.posts;
DROP POLICY IF EXISTS "posts_insert"    ON public.posts;
DROP POLICY IF EXISTS "posts_update"    ON public.posts;
DROP POLICY IF EXISTS "posts_delete"    ON public.posts;
DROP POLICY IF EXISTS "likes_select"    ON public.post_likes;
DROP POLICY IF EXISTS "likes_insert"    ON public.post_likes;
DROP POLICY IF EXISTS "likes_delete"    ON public.post_likes;
DROP POLICY IF EXISTS "comments_select" ON public.comments;
DROP POLICY IF EXISTS "comments_insert" ON public.comments;
DROP POLICY IF EXISTS "comments_delete" ON public.comments;
DROP POLICY IF EXISTS "chat_select"     ON public.chat_messages;
DROP POLICY IF EXISTS "chat_insert"     ON public.chat_messages;

CREATE POLICY "profiles_select" ON public.profiles      FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON public.profiles      FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "posts_select"    ON public.posts         FOR SELECT USING (true);
CREATE POLICY "posts_insert"    ON public.posts         FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update"    ON public.posts         FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "posts_delete"    ON public.posts         FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "likes_select"    ON public.post_likes    FOR SELECT USING (true);
CREATE POLICY "likes_insert"    ON public.post_likes    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete"    ON public.post_likes    FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "comments_select" ON public.comments      FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON public.comments      FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON public.comments      FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "chat_select"     ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "chat_insert"     ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============== 7. Realtime 활성화 (이미 등록돼있으면 무시) ==============

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============== 8. Schema cache 갱신 + 결과 확인 ==============

NOTIFY pgrst, 'reload schema';

SELECT 'profiles'      AS tbl, count(*) AS rows FROM public.profiles
UNION ALL SELECT 'posts',         count(*) FROM public.posts
UNION ALL SELECT 'post_likes',    count(*) FROM public.post_likes
UNION ALL SELECT 'comments',      count(*) FROM public.comments
UNION ALL SELECT 'chat_messages', count(*) FROM public.chat_messages;
