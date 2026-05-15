import { NextRequest, NextResponse } from 'next/server'
import { getEvents, createEvent } from '@/lib/notion'

export async function GET() {
  try {
    const events = await getEvents()
    return NextResponse.json(events)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    await createEvent(body)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
