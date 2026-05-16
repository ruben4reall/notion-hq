import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json() // 'accept' | 'decline'
  if (!['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  }

  const db = getClient()

  const { data: inv } = await db
    .from('project_invitations')
    .select('org_id, invited_email')
    .eq('id', id)
    .single()

  if (!inv || inv.invited_email !== user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.from('project_invitations').update({ status: action === 'accept' ? 'accepted' : 'declined' }).eq('id', id)

  if (action === 'accept') {
    await db.from('org_members').insert({ org_id: inv.org_id, user_id: user.id, role: 'member' })
  }

  return NextResponse.json({ ok: true })
}
