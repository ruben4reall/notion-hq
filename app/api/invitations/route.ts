import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getClient()

  const { data } = await db
    .from('project_invitations')
    .select('id, org_id, invited_by, status, created_at, organizations(name)')
    .eq('invited_email', user.email.toLowerCase())
    .eq('status', 'pending')

  const invitations = (data || []).map((inv: any) => ({
    id: inv.id,
    org_id: inv.org_id,
    project_name: inv.organizations?.name || '',
    status: inv.status,
    created_at: inv.created_at,
  }))

  return NextResponse.json(invitations)
}
