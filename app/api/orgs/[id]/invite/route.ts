import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

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

  const { data: org } = await db.from('organizations').select('name').eq('id', id).single()

  // Check target user exists
  const { data: { users } } = await db.auth.admin.listUsers()
  const target = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
  if (!target) return NextResponse.json({ error: 'Aucun compte trouvé pour cet email' }, { status: 404 })

  // Already a member?
  const { data: existing } = await db
    .from('org_members')
    .select('id')
    .eq('org_id', id)
    .eq('user_id', target.id)
    .single()
  if (existing) return NextResponse.json({ error: 'Déjà membre du projet' }, { status: 409 })

  // Upsert invitation
  const { error } = await db.from('project_invitations').upsert({
    org_id: id,
    invited_by: user.id,
    invited_email: email.toLowerCase(),
    status: 'pending',
  }, { onConflict: 'org_id,invited_email' })

  if (error) return NextResponse.json({ error: 'Erreur invitation' }, { status: 500 })

  // Notify target user
  await db.from('notifications').insert({
    message: `${user.name} vous invite à rejoindre le projet "${org?.name}"`,
    type: 'info',
    de: user.name,
    pour: target.user_metadata?.full_name || target.email,
  })

  return NextResponse.json({ ok: true })
}
