-- =============================================
-- AI 분석 결과 캐시 테이블
-- Supabase SQL Editor에서 실행하세요
-- =============================================

CREATE TABLE IF NOT EXISTS public.place_rules (
  place_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  pet_friendly TEXT,
  vaccination TEXT,
  carrier_required BOOLEAN,
  dining_area TEXT,
  size_limit TEXT,
  has_outdoor_playground BOOLEAN,
  grass_type TEXT,
  playground_size TEXT,
  size_separation BOOLEAN,
  fee_info TEXT,
  hours TEXT,
  rules JSONB DEFAULT '[]'::jsonb,
  summary TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_rules_updated_at ON public.place_rules(updated_at);

ALTER TABLE public.place_rules ENABLE ROW LEVEL SECURITY;

-- 공유 캐시이므로 누구나 읽기/쓰기 가능
DROP POLICY IF EXISTS "place_rules_select" ON public.place_rules;
DROP POLICY IF EXISTS "place_rules_insert" ON public.place_rules;
DROP POLICY IF EXISTS "place_rules_update" ON public.place_rules;

CREATE POLICY "place_rules_select" ON public.place_rules FOR SELECT USING (true);
CREATE POLICY "place_rules_insert" ON public.place_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "place_rules_update" ON public.place_rules FOR UPDATE USING (true);
