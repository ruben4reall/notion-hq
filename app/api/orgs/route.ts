import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient } from '@/lib/db'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await getClient()
    .from('org_members')
    .select('role, organizations(id, name, slug)')
    .eq('user_id', user.id)

  if (error) return NextResponse.json([], { status: 500 })

  const orgIds = (data || []).map((m: any) => m.organizations?.id).filter(Boolean)
  const counts: Record<string, number> = {}
  if (orgIds.length > 0) {
    const { data: memberData } = await getClient()
      .from('org_members')
      .select('org_id')
      .in('org_id', orgIds)
    for (const m of memberData || []) {
      if (m.org_id) counts[m.org_id] = (counts[m.org_id] || 0) + 1
    }
  }

  const orgs = (data || []).map((m: any) => ({
    id: m.organizations.id,
    name: m.organizations.name,
    slug: m.organizations.slug,
    role: m.role,
    member_count: counts[m.organizations.id] || 1,
  }))

  return NextResponse.json(orgs)
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

  const db = getClient()

  // Max 5 projects
  const { count } = await db
    .from('org_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('role', 'admin')

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: 'Maximum 5 projets atteint' }, { status: 403 })
  }

  const slug = slugify(name)
  const { data: org, error } = await db
    .from('organizations')
    .insert({ name: name.trim(), slug, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Erreur création' }, { status: 500 })

  await db.from('org_members').insert({ org_id: org.id, user_id: user.id, role: 'admin' })

  return NextResponse.json(org)
}
