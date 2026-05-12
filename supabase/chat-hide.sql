-- 채팅 메시지에 숨김 플래그 추가
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;

-- 관리자는 채팅 메시지의 hidden 값 변경 가능
DROP POLICY IF EXISTS "chat_admin_update" ON public.chat_messages;
CREATE POLICY "chat_admin_update" ON public.chat_messages FOR UPDATE USING (public.is_admin());

-- 인덱스 추가 (조회 성능)
CREATE INDEX IF NOT EXISTS idx_chat_messages_hidden ON public.chat_messages(hidden, created_at);
