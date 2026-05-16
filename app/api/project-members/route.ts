import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json([], { status: 401 })

  const orgId = req.cookies.get('current_org_id')?.value
  if (!orgId) return NextResponse.json([])

  const db = getClient()

  const { data: members } = await db
    .from('org_members')
    .select('user_id')
    .eq('org_id', orgId)

  if (!members?.length) return NextResponse.json([])

  const result = []
  for (const m of members) {
    const { data: { user: u } } = await db.auth.admin.getUserById(m.user_id)
    if (u) {
      const name = (u.user_metadata?.full_name as string) || u.email || ''
      const { data: presence } = await db.from('presence').select('avatar_url').eq('username', name).maybeSingle()
      result.push({
        id: u.id,
        name,
        email: u.email || '',
        color: (u.user_metadata?.color as string) || '#7c6af5',
        avatarUrl: (presence as any)?.avatar_url ?? null,
      })
    }
  }

  return NextResponse.json(result)
}
