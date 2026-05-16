import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getClient()

  const { data: membership } = await db
    .from('org_members')
    .select('role')
    .eq('org_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: org } = await db
    .from('organizations')
    .select('id, name, slug, created_by, created_at')
    .eq('id', id)
    .single()

  const { data: members } = await db
    .from('org_members')
    .select('user_id, role, joined_at')
    .eq('org_id', id)

  // Get display names from Supabase auth
  const userIds = (members || []).map((m: any) => m.user_id)
  const enriched = []
  for (const m of members || []) {
    const { data: { user: u } } = await db.auth.admin.getUserById(m.user_id)
    enriched.push({
      id: m.user_id,
      name: u?.user_metadata?.full_name || u?.email || m.user_id,
      email: u?.email || '',
      role: m.role,
      joined_at: m.joined_at,
    })
  }

  const { data: invitations } = await db
    .from('project_invitations')
    .select('id, invited_email, status, created_at')
    .eq('org_id', id)
    .eq('status', 'pending')

  return NextResponse.json({
    ...org,
    my_role: membership.role,
    members: enriched,
    pending_invitations: invitations || [],
  })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getClient()

  const { data: membership } = await db
    .from('org_members')
    .select('role')
    .eq('org_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'admin') {
    return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
  }

  await db.from('organizations').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
