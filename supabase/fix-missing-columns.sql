-- =============================================================
-- posts/comments/post_likes/profiles 누락 컬럼 보충
-- Supabase 콘솔 → SQL Editor → New query → 붙여넣고 Run
-- 안전: IF NOT EXISTS 라서 이미 있으면 스킵
-- =============================================================

-- posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname TEXT DEFAULT '익명';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- comments
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- chat_messages
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Schema cache 강제 갱신
NOTIFY pgrst, 'reload schema';

-- 확인용: posts 테이블의 모든 컬럼 출력
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'posts'
ORDER BY ordinal_position;
