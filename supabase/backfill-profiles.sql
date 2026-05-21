-- =============================================================
-- 기존 auth.users 중 profiles에 누락된 항목 보충
-- Supabase 콘솔 → SQL Editor → New query → 붙여넣고 Run
-- =============================================================

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

-- 결과 확인용 (백필 후 카운트 비교)
SELECT
  (SELECT count(*) FROM auth.users)     AS auth_users_count,
  (SELECT count(*) FROM public.profiles) AS profiles_count;
