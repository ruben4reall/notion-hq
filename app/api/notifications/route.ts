import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getNotifications } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json([])
  try {
    return NextResponse.json(await getNotifications(user.name, user.email))
  } catch (err) {
    console.error(err)
    return NextResponse.json([])
  }
}
