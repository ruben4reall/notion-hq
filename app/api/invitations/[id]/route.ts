import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const action = String(body?.action || '')
  if (!['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  }

  const db = getClient()

  const { data: inv } = await db
    .from('project_invitations')
    .select('org_id, invited_email')
    .eq('id', id)
    .maybeSingle()

  if (!inv || inv.invited_email !== user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.from('project_invitations')
    .update({ status: action === 'accept' ? 'accepted' : 'declined' })
    .eq('id', id)

  if (action === 'accept') {
    // ON CONFLICT prevents duplicate membership if called twice
    const { error } = await db.from('org_members').upsert(
      { org_id: inv.org_id, user_id: user.id, role: 'member' },
      { onConflict: 'org_id,user_id', ignoreDuplicates: true }
    )
    if (error) {
      console.error('Failed to add org member:', error)
      return NextResponse.json({ error: 'Failed to join project' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
