import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query') || '동물병원'
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const radius = searchParams.get('radius') || '20000'
  const page = searchParams.get('page') || '1'

  const kakaoKey = process.env.KAKAO_REST_API_KEY?.trim()

  console.log('[hospitals] kakaoKey exists:', !!kakaoKey, 'lat:', lat, 'lng:', lng)

  // 1. 카카오 Local API 우선 (위치 기반 검색)
  if (kakaoKey && lat && lng) {
    try {
      const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&x=${lng}&y=${lat}&radius=${radius}&sort=distance&size=15&page=${page}`
      const res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${kakaoKey}` },
        next: { revalidate: 300 },
      })
      console.log('[hospitals] kakao status:', res.status)
      if (!res.ok) {
        const errBody = await res.text()
        console.error('[hospitals] kakao error body:', errBody)
      }
      if (res.ok) {
        const data = await res.json()
        console.log('[hospitals] kakao results:', data.documents?.length)
        const items = (data.documents || []).map((d: any) => ({
          id: `kakao-${d.id}`,
          name: d.place_name,
          address: d.road_address_name || d.address_name,
          phone: d.phone,
          lat: parseFloat(d.y),
          lng: parseFloat(d.x),
          distance: parseFloat(d.distance) / 1000,
          category: d.category_name,
          link: d.place_url,
          source: 'kakao',
        }))
        return NextResponse.json({ items })
      }
    } catch (e) {
      console.error('Kakao API error:', e)
    }
  }

  // 2. 네이버 Local Search 폴백
  const naverClientId = process.env.NAVER_CLIENT_ID || process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
  const naverSecret = process.env.NAVER_CLIENT_SECRET
  if (naverClientId && naverSecret) {
    try {
      const res = await fetch(
        `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=random`,
        {
          headers: {
            'X-Naver-Client-Id': naverClientId,
            'X-Naver-Client-Secret': naverSecret,
          },
          next: { revalidate: 300 },
        }
      )
      if (res.ok) {
        const data = await res.json()
        const items = (data.items || []).map((it: any, i: number) => ({
          id: `naver-${i}-${it.title}`,
          name: it.title.replace(/<[^>]+>/g, ''),
          address: it.roadAddress || it.address,
          phone: it.telephone,
          lat: parseInt(it.mapy) / 1e7,
          lng: parseInt(it.mapx) / 1e7,
          link: it.link,
          source: 'naver',
        }))
        return NextResponse.json({ items })
      }
    } catch (e) {
      console.error('Naver API error:', e)
    }
  }

  return NextResponse.json({ items: [], error: 'No API configured' }, { status: 200 })
}
