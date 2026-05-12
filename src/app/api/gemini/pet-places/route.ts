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

const CACHE_TTL_DAYS = 30 // 30일 이상된 캐시는 재분석

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !key || !url.startsWith('http')) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function dbToEnrichment(row: any) {
  return {
    petFriendly: row.pet_friendly,
    vaccination: row.vaccination,
    carrierRequired: row.carrier_required,
    diningArea: row.dining_area,
    sizeLimit: row.size_limit,
    hasOutdoorPlayground: row.has_outdoor_playground,
    grassType: row.grass_type,
    playgroundSize: row.playground_size,
    sizeSeparation: row.size_separation,
    feeInfo: row.fee_info,
    hours: row.hours,
    rules: row.rules || [],
    summary: row.summary,
  }
}

function enrichmentToDb(place: any, e: any) {
  return {
    place_id: place.id,
    name: place.name,
    category: place.categoryLabel,
    pet_friendly: e.petFriendly,
    vaccination: e.vaccination,
    carrier_required: e.carrierRequired ?? null,
    dining_area: e.diningArea,
    size_limit: e.sizeLimit,
    has_outdoor_playground: e.hasOutdoorPlayground ?? null,
    grass_type: e.grassType,
    playground_size: e.playgroundSize,
    size_separation: e.sizeSeparation ?? null,
    fee_info: e.feeInfo,
    hours: e.hours,
    rules: Array.isArray(e.rules) ? e.rules : [],
    summary: e.summary,
    updated_at: new Date().toISOString(),
  }
}

export async function POST(request: Request) {
  try {
    const { places } = await request.json()
    if (!Array.isArray(places) || places.length === 0) {
      return NextResponse.json({ enrichments: [] })
    }

    const supabase = getSupabase()

    // 1. 캐시 조회
    const cachedMap = new Map<string, any>()
    if (supabase) {
      const ids = places.map((p: any) => p.id).filter(Boolean)
      const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('place_rules')
        .select('*')
        .in('place_id', ids)
        .gte('updated_at', cutoff)
      if (data) {
        for (const row of data) cachedMap.set(row.place_id, row)
      }
    }

    // 2. 캐시에 없는 것만 Gemini 분석
    const needAnalysis = places.filter((p: any) => !cachedMap.has(p.id))

    let newEnrichmentsMap = new Map<string, any>()
    if (needAnalysis.length > 0) {
      const apiKey = process.env.GEMINI_API_KEY?.trim()
      if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey)
        const prompt = `2026년 현재 한국 애견 동반 장소 ${needAnalysis.length}곳의 규정을 추정하세요.
※ 모든 장소는 이미 반려동물 친화 키워드로 검색된 결과이므로 기본 동반 가능으로 간주.

${needAnalysis.map((p: any, i: number) => `${i + 1}. ${p.name} [${p.categoryLabel}] ${p.address || ''} / 카테고리: ${p.rawCategory || ''}`).join('\n')}

입력 순서대로 JSON 배열:
[{
  "petFriendly": "가능|조건부|불가",
  "vaccination": "필수|권장|불필요|확인필요",
  "carrierRequired": true/false,
  "diningArea": "전체|외부석만|특정구역만|해당없음",
  "sizeLimit": "소형견만|전 견종 등",
  "hasOutdoorPlayground": true/false,
  "grassType": "천연잔디|인조잔디|흙|복합|해당없음",
  "playgroundSize": "소형|중형|대형|해당없음",
  "sizeSeparation": true/false,
  "feeInfo": "무료|유료|음료주문필수|해당없음",
  "hours": "예: 11:00-22:00",
  "rules": ["짧은 규정 3개"],
  "summary": "한줄 요약"
}]

기본값 "가능". 확신 없으면 "조건부". JSON 배열만 반환.`

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
            console.log(`[pet-places-enrich] ${modelName} failed: ${e?.message?.slice(0, 200)}`)
            continue
          }
        }

        if (text) {
          let arr: any[] = []
          try {
            const parsed = JSON.parse(text)
            arr = Array.isArray(parsed) ? parsed : parsed.places || []
          } catch {
            arr = []
          }
          for (let i = 0; i < needAnalysis.length; i++) {
            if (arr[i]) newEnrichmentsMap.set(needAnalysis[i].id, arr[i])
          }

          // 3. 새 분석 결과를 Supabase에 저장
          if (supabase && newEnrichmentsMap.size > 0) {
            const rows = needAnalysis
              .filter((p: any) => newEnrichmentsMap.has(p.id))
              .map((p: any) => enrichmentToDb(p, newEnrichmentsMap.get(p.id)))
            if (rows.length > 0) {
              await supabase.from('place_rules').upsert(rows, { onConflict: 'place_id' })
            }
          }
        }
      }
    }

    // 4. 입력 순서대로 결과 반환
    const enrichments = places.map((p: any) => {
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
    console.error('Pet places enrich error:', e)
    return NextResponse.json({ enrichments: [], error: e.message }, { status: 200 })
  }
}
