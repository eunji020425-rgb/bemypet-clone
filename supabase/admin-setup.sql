-- 관리자 권한 설정
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 본인을 관리자로 지정 (이메일을 본인 것으로 변경)
-- 예: UPDATE public.profiles SET is_admin = true WHERE email = 'your_email@example.com';
