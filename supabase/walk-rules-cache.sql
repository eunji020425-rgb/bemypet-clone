-- 산책로 AI 분석 캐시 테이블
CREATE TABLE IF NOT EXISTS public.walk_rules (
  trail_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  difficulty TEXT,
  popularity TEXT,
  length TEXT,
  description TEXT,
  tip TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  dog_friendly TEXT,
  accessible TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 테이블에 컬럼이 없을 수 있으니 추가 (기존 사용자용)
ALTER TABLE public.walk_rules ADD COLUMN IF NOT EXISTS dog_friendly TEXT;
ALTER TABLE public.walk_rules ADD COLUMN IF NOT EXISTS accessible TEXT;

CREATE INDEX IF NOT EXISTS idx_walk_rules_updated_at ON public.walk_rules(updated_at);

ALTER TABLE public.walk_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "walk_rules_select" ON public.walk_rules;
DROP POLICY IF EXISTS "walk_rules_insert" ON public.walk_rules;
DROP POLICY IF EXISTS "walk_rules_update" ON public.walk_rules;

CREATE POLICY "walk_rules_select" ON public.walk_rules FOR SELECT USING (true);
CREATE POLICY "walk_rules_insert" ON public.walk_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "walk_rules_update" ON public.walk_rules FOR UPDATE USING (true);
