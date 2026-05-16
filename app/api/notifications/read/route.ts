import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient } from '@/lib/db'

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { ids } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ ok: true })

    const db = getClient()
    // Only mark as read notifications that belong to this user
    await db.from('notifications')
      .update({ lu: true })
      .in('id', ids)
      .or(`pour.eq.Tous,pour.eq.${user.name},pour.eq.${user.email}`)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
