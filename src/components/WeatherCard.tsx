'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Sun, Cloud, CloudRain, Snowflake } from 'lucide-react'
import { PM_LABEL, UV_LABEL, type WeatherSummary } from '@/lib/weather/types'

const LEVEL_THEME = {
  good:    { bg: '#E6F8F2', text: '#2BAE8E', border: '#bdebdc' },
  caution: { bg: '#FAEEDA', text: '#B07215', border: '#f1d9a8' },
  avoid:   { bg: '#FCEAEA', text: '#C93030', border: '#f5c5c5' },
}

const SEOUL = { lat: 37.5665, lng: 126.978 }

function WeatherIcon({ kind, size = 28, color }: { kind: WeatherSummary['current']['weather']; size?: number; color?: string }) {
  const props = { size, strokeWidth: 2, color }
  if (kind === 'rainy') return <CloudRain {...props} />
  if (kind === 'snowy') return <Snowflake {...props} />
  if (kind === 'cloudy') return <Cloud {...props} />
  return <Sun {...props} />
}

export default function WeatherCard() {
  const [data, setData] = useState<WeatherSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [permissionDenied, setPermissionDenied] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchWeather = async (lat: number, lng: number) => {
      try {
        const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`)
        if (!res.ok) throw new Error('fetch_failed')
        const json = await res.json() as WeatherSummary
        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (typeof window === 'undefined' || !navigator.geolocation) {
      fetchWeather(SEOUL.lat, SEOUL.lng)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      () => {
        if (!cancelled) setPermissionDenied(true)
        fetchWeather(SEOUL.lat, SEOUL.lng)
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 },
    )

    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <Link href="/walk" className="block">
        <section className="mt-6 backdrop-blur-xl bg-white/65 border border-white/50 rounded-3xl p-7">
          <p className="text-[11px] text-[#3a7ab8] tracking-[2px] font-semibold">— 오늘 —</p>
          <h3 className="mt-2 text-xl text-[#94a3b8]">날씨 불러오는 중...</h3>
          <div className="h-12 mt-3 bg-white/40 rounded-2xl animate-pulse" />
        </section>
      </Link>
    )
  }

  if (!data) {
    return (
      <Link href="/walk" className="block">
        <section className="mt-6 backdrop-blur-xl bg-white/65 border border-white/50 rounded-3xl p-7">
          <p className="text-[11px] text-[#3a7ab8] tracking-[2px] font-semibold">— 오늘 —</p>
          <h3 className="mt-2 text-lg text-[#6a7c95]">날씨 정보를 불러오지 못했어요</h3>
          <p className="mt-2 text-xs text-[#94a3b8]">다시 시도하거나 산책 페이지로 이동하세요</p>
        </section>
      </Link>
    )
  }

  const theme = LEVEL_THEME[data.recommendation.level]

  return (
    <Link href="/walk" className="block">
      <section
        className="mt-6 rounded-3xl p-6 border transition hover:opacity-95"
        style={{ background: theme.bg, borderColor: theme.border }}
      >
        <p className="text-[11px] tracking-[2px] font-semibold opacity-70" style={{ color: theme.text }}>
          — 오늘 —
        </p>

        <div className="flex items-center gap-3 mt-2">
          <WeatherIcon kind={data.current.weather} size={36} color={theme.text} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" style={{ color: theme.text }}>
                {data.current.temp}°C
              </span>
              {data.current.feelsLike !== data.current.temp && (
                <span className="text-xs opacity-70" style={{ color: theme.text }}>
                  체감 {data.current.feelsLike}°
                </span>
              )}
            </div>
            <p className="text-base font-bold mt-0.5" style={{ color: theme.text }}>
              {data.recommendation.message}
            </p>
          </div>
        </div>

        {/* 보조 정보 칩 */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span
            className="text-[11px] px-2 py-1 rounded-full font-bold"
            style={{ background: 'rgba(255,255,255,0.6)', color: theme.text }}
          >
            🌫 미세먼지 {PM_LABEL[data.air.pm25.grade]}
          </span>
          <span
            className="text-[11px] px-2 py-1 rounded-full font-bold"
            style={{ background: 'rgba(255,255,255,0.6)', color: theme.text }}
          >
            ☀ 자외선 {UV_LABEL[data.uv.grade]}
          </span>
          {data.current.precipitation > 0 && (
            <span
              className="text-[11px] px-2 py-1 rounded-full font-bold"
              style={{ background: 'rgba(255,255,255,0.6)', color: theme.text }}
            >
              ☔ 강수 {data.current.precipitation}%
            </span>
          )}
        </div>

        {permissionDenied && (
          <p className="text-[10px] mt-2 opacity-60" style={{ color: theme.text }}>
            위치 권한이 거부되어 서울 기준입니다
          </p>
        )}
      </section>
    </Link>
  )
}
