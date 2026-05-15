import { NextRequest, NextResponse } from 'next/server'
import { getPresence, upsertPresence } from '@/lib/notion'

export async function GET() {
  if (!process.env.NOTION_PRESENCE_DB) return NextResponse.json([])
  try {
    return NextResponse.json(await getPresence())
  } catch (err) {
    console.error(err)
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.NOTION_PRESENCE_DB) return NextResponse.json({ ok: true })
  try {
    const { username } = await req.json()
    if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 })
    await upsertPresence(username)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
