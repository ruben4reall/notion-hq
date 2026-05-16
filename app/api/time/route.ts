import { NextRequest, NextResponse } from 'next/server'
import { getUser, getOrgId } from '@/lib/auth'
import { getTimeSessions, getActiveSession, startTimeSession } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({}, { status: 401 })
  const orgId = getOrgId(req)
  if (!orgId) return NextResponse.json({ sessions: [], active: null }, { status: 400 })
  try {
    const days = parseInt(req.nextUrl.searchParams.get('days') || '7')
    const [sessions, active] = await Promise.all([
      getTimeSessions(orgId, user.name, days),
      getActiveSession(orgId, user.name),
    ])
    return NextResponse.json({ sessions, active })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ sessions: [], active: null })
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = getOrgId(req)
  if (!orgId) return NextResponse.json({ error: 'No project' }, { status: 400 })
  try {
    const { categorie, note } = await req.json()
    const session = await startTimeSession(orgId, user.name, categorie || 'Travail', note || '')
    return NextResponse.json(session)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
