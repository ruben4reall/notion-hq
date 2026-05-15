import { NextRequest, NextResponse } from 'next/server'
import { getPresence, upsertPresence } from '@/lib/notion'

export async function GET() {
  try {
    return NextResponse.json(await getPresence())
  } catch (err) {
    console.error(err)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(req: NextRequest) {
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
