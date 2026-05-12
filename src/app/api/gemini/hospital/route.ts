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
    hours: row.hours,
    is24h: row.is_24h,
    emergency: row.emergency,
    services: row.services || [],
    summary: row.summary,
  }
}

function enrichmentToDb(h: any, e: any) {
  return {
    hospital_id: h.id,
    name: h.name,
    hours: e.hours,
    is_24h: e.is24h ?? null,
    emergency: e.emergency ?? null,
    services: Array.isArray(e.services) ? e.services : [],
    summary: e.summary,
    updated_at: new Date().toISOString(),
  }
}

export async function POST(request: Request) {
  try {
    const { hospitals } = await request.json()
    if (!Array.isArray(hospitals) || hospitals.length === 0) {
      return NextResponse.json({ enrichments: [] })
    }

    const supabase = getSupabase()

    const cachedMap = new Map<string, any>()
    if (supabase) {
      const ids = hospitals.map((p: any) => p.id).filter(Boolean)
      const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('hospital_rules')
        .select('*')
        .in('hospital_id', ids)
        .gte('updated_at', cutoff)
      if (data) {
        for (const row of data) cachedMap.set(row.hospital_id, row)
      }
    }

    const needAnalysis = hospitals.filter((p: any) => !cachedMap.has(p.id))
    const newEnrichmentsMap = new Map<string, any>()

    if (needAnalysis.length > 0) {
      const apiKey = process.env.GEMINI_API_KEY?.trim()
      if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey)
        const prompt = `한국의 동물병원 ${needAnalysis.length}곳 정보를 일반적인 동물병원 기준으로 추정하세요.

${needAnalysis.map((p: any, i: number) => `${i + 1}. ${p.name} ${p.address || ''}`).join('\n')}

각 병원 입력 순서대로 JSON 배열:
[{
  "hours": "진료 시간 (예: 평일 10:00-19:00, 주말 10:00-17:00 또는 24시간)",
  "is24h": true/false (이름에 '24시'나 '응급'이 있으면 true),
  "emergency": true/false (응급실 운영 여부),
  "services": ["진료과목/서비스 2-3개 예: 내과, 외과, 치과, 영상진단, 입원"],
  "summary": "한줄 요약 (예: 24시간 응급진료 가능 종합병원)"
}]

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
            console.log(`[hospital] ${modelName} failed: ${e?.message?.slice(0, 200)}`)
            continue
          }
        }

        if (text) {
          let arr: any[] = []
          try {
            const parsed = JSON.parse(text)
            arr = Array.isArray(parsed) ? parsed : parsed.hospitals || []
          } catch {
            arr = []
          }
          for (let i = 0; i < needAnalysis.length; i++) {
            if (arr[i]) newEnrichmentsMap.set(needAnalysis[i].id, arr[i])
          }

          if (supabase && newEnrichmentsMap.size > 0) {
            const rows = needAnalysis
              .filter((p: any) => newEnrichmentsMap.has(p.id))
              .map((p: any) => enrichmentToDb(p, newEnrichmentsMap.get(p.id)))
            if (rows.length > 0) {
              await supabase.from('hospital_rules').upsert(rows, { onConflict: 'hospital_id' })
            }
          }
        }
      }
    }

    const enrichments = hospitals.map((p: any) => {
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
    console.error('Hospital enrich error:', e)
    return NextResponse.json({ enrichments: [], error: e.message }, { status: 200 })
  }
}
