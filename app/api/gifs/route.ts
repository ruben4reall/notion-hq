import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.GIPHY_API_KEY || 'dc6zaTOxFJmzC'
const BASE = 'https://api.giphy.com/v1/gifs'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  const url = q
    ? `${BASE}/search?api_key=${API_KEY}&q=${encodeURIComponent(q)}&limit=16&rating=g&lang=fr`
    : `${BASE}/trending?api_key=${API_KEY}&limit=16&rating=g`

  try {
    const res = await fetch(url, { next: { revalidate: 60 } })
    const data = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gifs = (data.data || []).map((g: any) => ({
      id: g.id,
      url: g.images?.fixed_height_small?.url || g.images?.fixed_height?.url || '',
      preview: g.images?.fixed_height_small_still?.url || '',
      title: g.title || '',
    }))
    return NextResponse.json(gifs)
  } catch (err) {
    console.error(err)
    return NextResponse.json([])
  }
}
