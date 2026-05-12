-- =============================================
-- 관리자 RLS 정책 추가
-- 관리자는 모든 게시글/댓글/사용자/캐시를 관리할 수 있도록 허용
-- =============================================

-- 관리자 확인 헬퍼 함수
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 1. posts: 관리자는 모든 게시글 삭제·수정 가능
DROP POLICY IF EXISTS "posts_admin_delete" ON public.posts;
DROP POLICY IF EXISTS "posts_admin_update" ON public.posts;
CREATE POLICY "posts_admin_delete" ON public.posts FOR DELETE USING (public.is_admin());
CREATE POLICY "posts_admin_update" ON public.posts FOR UPDATE USING (public.is_admin());

-- 2. comments: 관리자는 모든 댓글 삭제 가능
DROP POLICY IF EXISTS "comments_admin_delete" ON public.comments;
CREATE POLICY "comments_admin_delete" ON public.comments FOR DELETE USING (public.is_admin());

-- 3. chat_messages: 관리자는 모든 채팅 메시지 삭제 가능
DROP POLICY IF EXISTS "chat_admin_delete" ON public.chat_messages;
CREATE POLICY "chat_admin_delete" ON public.chat_messages FOR DELETE USING (public.is_admin());

-- 4. profiles: 관리자는 다른 사용자의 is_admin 변경 가능
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE USING (public.is_admin());

-- 5. AI 캐시 테이블: 관리자가 모두 삭제 가능 (이미 누구나 삭제 가능 상태인지 확인)
-- (기존 RLS가 모두에게 INSERT/UPDATE 허용이므로 DELETE 정책 추가)
DROP POLICY IF EXISTS "place_rules_delete" ON public.place_rules;
DROP POLICY IF EXISTS "walk_rules_delete" ON public.walk_rules;
DROP POLICY IF EXISTS "hospital_rules_delete" ON public.hospital_rules;
CREATE POLICY "place_rules_delete" ON public.place_rules FOR DELETE USING (public.is_admin());
CREATE POLICY "walk_rules_delete" ON public.walk_rules FOR DELETE USING (public.is_admin());
CREATE POLICY "hospital_rules_delete" ON public.hospital_rules FOR DELETE USING (public.is_admin());
