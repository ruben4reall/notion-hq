import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient } from '@/lib/db'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const userId = String(body?.userId || '').trim()
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  const db = getClient()

  const { data: membership } = await db
    .from('org_members')
    .select('role')
    .eq('org_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (membership.role !== 'admin' && userId !== user.id) {
    return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
  }

  // Prevent removing the last admin
  if (membership.role === 'admin' && userId === user.id) {
    const { data: admins } = await db
      .from('org_members')
      .select('user_id')
      .eq('org_id', id)
      .eq('role', 'admin')
    if ((admins || []).length <= 1) {
      return NextResponse.json({ error: 'Impossible de quitter : vous êtes le seul admin' }, { status: 409 })
    }
  }

  await db.from('org_members').delete().eq('org_id', id).eq('user_id', userId)
  return NextResponse.json({ ok: true })
}
