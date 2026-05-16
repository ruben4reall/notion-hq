import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient, getPresence, upsertPresence } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json([], { status: 401 })

  const orgId = req.cookies.get('current_org_id')?.value
  if (!orgId) return NextResponse.json([])

  const db = getClient()

  // Only show accepted org members (org_members = accepted only, not pending invitees)
  const { data: members } = await db.from('org_members').select('user_id').eq('org_id', orgId)
  if (!members?.length) return NextResponse.json([])

  // Resolve each member's display name (same logic as presence.username)
  const names = (await Promise.all(
    members.map(async (m: { user_id: string }) => {
      const { data: { user: u } } = await db.auth.admin.getUserById(m.user_id)
      return u ? ((u.user_metadata?.full_name as string) || u.email || '') : null
    })
  )).filter(Boolean) as string[]

  try {
    return NextResponse.json(await getPresence(names))
  } catch (err) {
    console.error(err)
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const username = String(body?.username || '').trim().slice(0, 100)
    if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 })
    await upsertPresence(username)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
