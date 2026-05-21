import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { DANGER_CATEGORIES } from '@/lib/danger/types'

export const runtime = 'nodejs'

const PostSchema = z.object({
  categories: z.array(z.enum(DANGER_CATEGORIES)).min(1).max(5),
  lat: z.number().min(33).max(39),
  lng: z.number().min(124).max(132),
  note: z.string().max(200).optional(),
})

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = PostSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  const { data, error } = await supabase.rpc('submit_danger_report', {
    p_categories: parsed.data.categories,
    p_lat: parsed.data.lat,
    p_lng: parsed.data.lng,
    p_note: parsed.data.note ?? null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // RPC가 json 반환 → { created_count, points_earned }
  return NextResponse.json(data)
}

const GetSchema = z.object({
  lat: z.coerce.number().min(33).max(39),
  lng: z.coerce.number().min(124).max(132),
  radius_km: z.coerce.number().min(0.1).max(20).default(2),
})

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = GetSchema.safeParse({
    lat: url.searchParams.get('lat'),
    lng: url.searchParams.get('lng'),
    radius_km: url.searchParams.get('radius_km') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('nearby_danger_reports', {
    p_lat: parsed.data.lat,
    p_lng: parsed.data.lng,
    p_radius_km: parsed.data.radius_km,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reports: data ?? [] })
}
