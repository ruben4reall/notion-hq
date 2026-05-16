import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient } from '@/lib/db'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  const db = getClient()

  const { data: membership } = await db
    .from('org_members')
    .select('role')
    .eq('org_id', id)
    .eq('user_id', user.id)
    .single()

  // Admin can remove anyone except themselves if last admin; member can only leave
  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (membership.role !== 'admin' && userId !== user.id) {
    return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
  }

  await db.from('org_members').delete().eq('org_id', id).eq('user_id', userId)
  return NextResponse.json({ ok: true })
}
