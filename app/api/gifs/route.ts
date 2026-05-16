import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.TENOR_API_KEY || 'LIVDSRZULELA'
const BASE = 'https://api.tenor.com/v1'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  const url = q
    ? `${BASE}/search?key=${API_KEY}&q=${encodeURIComponent(q)}&limit=16&contentfilter=medium&media_filter=minimal&locale=fr_FR`
    : `${BASE}/trending?key=${API_KEY}&limit=16&contentfilter=medium&media_filter=minimal`

  try {
    const res = await fetch(url, { next: { revalidate: 60 } })
    const data = await res.json()
    const gifs = (data.results || []).map((g: any) => {
      const media = g.media?.[0] || {}
      return {
        id: g.id,
        url: media.tinygif?.url || media.gif?.url || '',
        preview: media.tinygif?.preview || '',
        title: g.title || g.content_description || '',
      }
    })
    return NextResponse.json(gifs)
  } catch (err) {
    console.error(err)
    return NextResponse.json([])
  }
}
