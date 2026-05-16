import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getPresence, upsertPresence } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json([], { status: 401 })
  try {
    return NextResponse.json(await getPresence())
  } catch (err) {
    console.error(err)
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const username = String(body?.username || '').trim().slice(0, 100)
    if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 })
    await upsertPresence(username)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
