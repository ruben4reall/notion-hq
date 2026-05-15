import { NextRequest, NextResponse } from 'next/server'
import { getEvents, createEvent } from '@/lib/notion'

export async function GET() {
  if (!process.env.NOTION_EVENTS_DB) return NextResponse.json([])
  try {
    const events = await getEvents()
    return NextResponse.json(events)
  } catch (err) {
    console.error(err)
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.NOTION_EVENTS_DB) return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  try {
    const body = await req.json()
    await createEvent(body)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
