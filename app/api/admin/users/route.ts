import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/auth'
import { getClient } from '@/lib/db'

export async function GET(req: NextRequest) {
  if (!(await isSuperAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getClient()

  const [usersRes, membershipsRes, adminsRes] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from('org_members').select('user_id'),
    db.from('platform_admins').select('user_id'),
  ])

  const projectCounts: Record<string, number> = {}
  for (const m of membershipsRes.data || []) {
    projectCounts[m.user_id] = (projectCounts[m.user_id] || 0) + 1
  }
  const superAdminIds = new Set((adminsRes.data || []).map((a: any) => a.user_id))

  const users = (usersRes.data?.users || []).map((u: any) => ({
    id: u.id,
    name: (u.user_metadata?.full_name as string) || u.email || '',
    email: u.email || '',
    color: (u.user_metadata?.color as string) || '#7c6af5',
    created_at: u.created_at,
    project_count: projectCounts[u.id] || 0,
    is_superadmin: superAdminIds.has(u.id),
  }))

  return NextResponse.json(users)
}
