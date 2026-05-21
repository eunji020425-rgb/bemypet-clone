-- =============================================================
-- 산책 세션 기록 테이블
-- Supabase 콘솔 → SQL Editor → New query → Run
-- =============================================================

CREATE TABLE IF NOT EXISTS public.walk_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  trail_id    TEXT NOT NULL,                    -- 카카오 place ID
  trail_name  TEXT,
  trail_lat   DOUBLE PRECISION,
  trail_lng   DOUBLE PRECISION,
  started_at  TIMESTAMPTZ DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  duration_s  INTEGER                            -- ended_at 시점에 계산해서 저장
);

CREATE INDEX IF NOT EXISTS walk_sessions_user_idx
  ON public.walk_sessions(user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS walk_sessions_active_idx
  ON public.walk_sessions(trail_id) WHERE ended_at IS NULL;

ALTER TABLE public.walk_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "walk_sessions_select_self" ON public.walk_sessions;
DROP POLICY IF EXISTS "walk_sessions_insert_self" ON public.walk_sessions;
DROP POLICY IF EXISTS "walk_sessions_update_self" ON public.walk_sessions;

-- 본인 세션만 조회/생성/수정 (공개 카운트는 별도 view에서)
CREATE POLICY "walk_sessions_select_self"
  ON public.walk_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "walk_sessions_insert_self"
  ON public.walk_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "walk_sessions_update_self"
  ON public.walk_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 공개용 카운트 view (다른 사용자가 봐도 OK, 개인정보 없음)
CREATE OR REPLACE VIEW public.walk_route_active_counts AS
SELECT trail_id, COUNT(*) AS active_count
FROM public.walk_sessions
WHERE ended_at IS NULL
  AND started_at > NOW() - INTERVAL '4 hours'
GROUP BY trail_id;

GRANT SELECT ON public.walk_route_active_counts TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

SELECT 'walk_sessions ready' AS status;
