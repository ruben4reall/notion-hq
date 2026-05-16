import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getNotifications, getClient } from '@/lib/db'
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

// Delete specific notification IDs
export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json()
  if (!Array.isArray(ids) || !ids.length) return NextResponse.json({ ok: true })

  const db = getClient()
  const { error } = await db
    .from('notifications')
    .delete()
    .in('id', ids)
    .or(`pour.eq.${user.name},pour.eq.${user.email},pour.eq.Tous`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
