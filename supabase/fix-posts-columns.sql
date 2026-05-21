-- posts 테이블 누락 컬럼 보충 (전부 멱등)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- comments 테이블 누락 컬럼
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE;

-- chat_messages
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Schema cache 강제 갱신
NOTIFY pgrst, 'reload schema';

-- 확인용
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'posts'
ORDER BY ordinal_position;
