-- =============================================
-- 운영시간 컬럼 추가 + 병원 캐시 테이블
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. 산책로 테이블에 hours 컬럼 추가
ALTER TABLE public.walk_rules ADD COLUMN IF NOT EXISTS hours TEXT;

-- 2. 병원 캐시 테이블
CREATE TABLE IF NOT EXISTS public.hospital_rules (
  hospital_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hours TEXT,
  is_24h BOOLEAN,
  emergency BOOLEAN,
  services JSONB DEFAULT '[]'::jsonb,
  summary TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospital_rules_updated_at ON public.hospital_rules(updated_at);

ALTER TABLE public.hospital_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hospital_rules_select" ON public.hospital_rules;
DROP POLICY IF EXISTS "hospital_rules_insert" ON public.hospital_rules;
DROP POLICY IF EXISTS "hospital_rules_update" ON public.hospital_rules;

CREATE POLICY "hospital_rules_select" ON public.hospital_rules FOR SELECT USING (true);
CREATE POLICY "hospital_rules_insert" ON public.hospital_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "hospital_rules_update" ON public.hospital_rules FOR UPDATE USING (true);
