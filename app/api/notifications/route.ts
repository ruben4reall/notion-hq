import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getNotifications } from '@/lib/db'
import { cachedJson } from '@/lib/api-cache'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json([])
  try {
    return cachedJson(await getNotifications(user.name, user.email), 10, 20)
  } catch (err) {
    console.error(err)
    return NextResponse.json([])
  }
}
