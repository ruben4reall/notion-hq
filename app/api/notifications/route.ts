import { NextResponse } from 'next/server'
import { getNotifications } from '@/lib/db'

export async function GET() {
  if (!process.env.NOTION_NOTIFS_DB) return NextResponse.json([])
  try {
    return NextResponse.json(await getNotifications())
  } catch (err) {
    console.error(err)
    return NextResponse.json([])
  }
}
