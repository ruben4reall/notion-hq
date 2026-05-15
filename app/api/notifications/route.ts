import { NextResponse } from 'next/server'
import { getNotifications } from '@/lib/notion'

export async function GET() {
  try {
    return NextResponse.json(await getNotifications())
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
