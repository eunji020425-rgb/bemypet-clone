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
  "description": "특징과 환경 (2문장)",
  "tip": "강아지 산책 팁 (1문장)",
  "features": ["특징1","특징2","특징3"]
}]

판정 가이드:
- 동네 공원, 둘레길, 하천길, 호숫가, 잘 조성된 산책로 → dogFriendly: "가능", accessible: "양호"
- 일반 등산로, 산림보호구역, 자연휴양림 → dogFriendly: "조건부", accessible: "보통"
- 국립공원 내 출입 금지 등산로, 사찰 경내 → dogFriendly: "불가"
- 차량 진입 어렵거나 입구 험한 곳 → accessible: "불편"

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
