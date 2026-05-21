import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const MODEL_CHAIN = [
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
]

const CACHE_TTL_DAYS = 30

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !key || !url.startsWith('http')) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function dbToEnrichment(row: any) {
  return {
    difficulty: row.difficulty,
    popularity: row.popularity,
    length: row.length,
    description: row.description,
    tip: row.tip,
    features: row.features || [],
    dogFriendly: row.dog_friendly,
    accessible: row.accessible,
    hours: row.hours,
    // 확장 필드
    dogAllowed: row.dog_allowed,
    leashRequired: row.leash_required,
    leashMaxLengthCm: row.leash_max_length_cm,
    pickupRequired: row.pickup_required,
    hazards: row.hazards || [],
    confidence: row.confidence,
    sourceType: row.source_type,
    userConfirms: row.user_confirms || 0,
    userDisputes: row.user_disputes || 0,
  }
}

function enrichmentToDb(park: any, e: any) {
  return {
    trail_id: park.id,
    name: park.name,
    difficulty: e.difficulty,
    popularity: e.popularity,
    length: e.length,
    description: e.description,
    tip: e.tip,
    features: Array.isArray(e.features) ? e.features : [],
    dog_friendly: e.dogFriendly,
    accessible: e.accessible,
    hours: e.hours,
    // 확장 필드
    dog_allowed: e.dogAllowed,
    leash_required: e.leashRequired,
    leash_max_length_cm: e.leashMaxLengthCm,
    pickup_required: e.pickupRequired,
    hazards: Array.isArray(e.hazards) ? e.hazards : null,
    confidence: typeof e.confidence === 'number' ? e.confidence : 0.5,
    source_type: 'ai_extracted',
    updated_at: new Date().toISOString(),
  }
}

export async function POST(request: Request) {
  try {
    const { parks, petType } = await request.json()
    if (!Array.isArray(parks) || parks.length === 0) {
      return NextResponse.json({ enrichments: [] })
    }

    const supabase = getSupabase()

    // 1. 캐시 조회
    const cachedMap = new Map<string, any>()
    if (supabase) {
      const ids = parks.map((p: any) => p.id).filter(Boolean)
      const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('walk_rules')
        .select('*')
        .in('trail_id', ids)
        .gte('updated_at', cutoff)
      if (data) {
        for (const row of data) cachedMap.set(row.trail_id, row)
      }
    }

    // 2. 캐시에 없는 것만 Gemini 분석
    const needAnalysis = parks.filter((p: any) => !cachedMap.has(p.id))
    const newEnrichmentsMap = new Map<string, any>()

    if (needAnalysis.length > 0) {
      const apiKey = process.env.GEMINI_API_KEY?.trim()
      if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey)
        const prompt = `한국의 ${petType || '강아지'} 산책 전문가로 다음 공원/산책로 ${needAnalysis.length}곳을 평가하세요.

평가 기준:
- 강아지 동반이 실제로 가능한 곳인지 (목줄 착용 시 출입 가능, 펫 출입 금지 구역 아님)
- 누구나 쉽게 접근할 수 있는 곳인지 (입구 평탄, 차량/도보 접근 양호, 험한 산악·산림보호구역 아님)

각 장소 입력 순서대로 JSON 배열로:
[{
  "dogFriendly": "가능|조건부|불가",
  "accessible": "양호|보통|불편",
  "difficulty": "쉬움|보통|어려움",
  "popularity": "한산|보통|붐빔|매우 붐빔",
  "length": "산책로 총 거리 (예: 약 2.5km)",
  "hours": "개방 시간 (예: 24시간|05:00-22:00|일출-일몰)",
  "description": "특징과 환경 (2문장)",
  "tip": "강아지 산책 팁 (1문장)",
  "features": ["특징1","특징2","특징3"],

  "dogAllowed": "allowed|leashed_only|partial|forbidden|unknown",
  "leashRequired": true,
  "leashMaxLengthCm": 200,
  "pickupRequired": true,
  "hazards": ["tick","snake","wild_boar","steep","slippery_when_wet"],
  "confidence": 0.7
}]

판정 가이드:
- 동네 공원, 둘레길, 하천길, 호숫가, 잘 조성된 산책로 → dogFriendly: "가능", accessible: "양호", dogAllowed: "leashed_only"
- 일반 등산로, 산림보호구역, 자연휴양림 → dogFriendly: "조건부", accessible: "보통", dogAllowed: "partial"
- 국립공원 내 출입 금지 등산로, 사찰 경내 → dogFriendly: "불가", dogAllowed: "forbidden"
- 차량 진입 어렵거나 입구 험한 곳 → accessible: "불편"

추가 필드 가이드:
- leashRequired: 한국 동물보호법상 외부 공공장소는 거의 항상 true (잘 모르겠으면 true)
- leashMaxLengthCm: 보통 200 (2m). 좁은 산책로면 150
- pickupRequired: 공원이면 거의 항상 true (배변봉투 의무)
- hazards: 산/숲이면 ["tick"] 또는 ["tick","snake"], 산악지대면 ["wild_boar","steep"], 비온 후 위험한 데크/돌길이면 ["slippery_when_wet"]
- confidence: 유명 공원·정보 명확 0.8 / 일반 동네 공원 0.6 / 모호한 곳 0.4

장소:
${needAnalysis.map((p: any, i: number) => `${i + 1}. ${p.name} (${p.address || ''})`).join('\n')}

JSON 배열만 반환.`

        let text = ''
        for (const modelName of MODEL_CHAIN) {
          try {
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: { responseMimeType: 'application/json' },
            })
            const result = await model.generateContent(prompt)
            text = result.response.text()
            if (text) break
          } catch (e: any) {
            console.log(`[walk] ${modelName} failed: ${e?.message?.slice(0, 200)}`)
            continue
          }
        }

        if (text) {
          let arr: any[] = []
          try {
            const parsed = JSON.parse(text)
            arr = Array.isArray(parsed) ? parsed : parsed.trails || []
          } catch {
            arr = []
          }
          for (let i = 0; i < needAnalysis.length; i++) {
            if (arr[i]) newEnrichmentsMap.set(needAnalysis[i].id, arr[i])
          }

          // 3. 캐시에 저장
          if (supabase && newEnrichmentsMap.size > 0) {
            const rows = needAnalysis
              .filter((p: any) => newEnrichmentsMap.has(p.id))
              .map((p: any) => enrichmentToDb(p, newEnrichmentsMap.get(p.id)))
            if (rows.length > 0) {
              await supabase.from('walk_rules').upsert(rows, { onConflict: 'trail_id' })
            }
          }
        }
      }
    }

    // 4. 입력 순서대로 결과 반환
    const enrichments = parks.map((p: any) => {
      if (cachedMap.has(p.id)) return dbToEnrichment(cachedMap.get(p.id))
      if (newEnrichmentsMap.has(p.id)) return newEnrichmentsMap.get(p.id)
      return null
    })

    return NextResponse.json({
      enrichments,
      cached: cachedMap.size,
      analyzed: newEnrichmentsMap.size,
    })
  } catch (e: any) {
    console.error('Walk enrich error:', e)
    return NextResponse.json({ enrichments: [], error: e.message }, { status: 200 })
  }
}
