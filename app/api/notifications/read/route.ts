import { NextRequest, NextResponse } from 'next/server'
import { markNotificationsRead } from '@/lib/notion'

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json()
    await markNotificationsRead(ids)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
