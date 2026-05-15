import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getTimeSessions, getActiveSession, startTimeSession } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({}, { status: 401 })
  const username = token.name as string
  try {
    const days = parseInt(req.nextUrl.searchParams.get('days') || '7')
    const [sessions, active] = await Promise.all([
      getTimeSessions(username, days),
      getActiveSession(username),
    ])
    return NextResponse.json({ sessions, active })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ sessions: [], active: null })
  }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const username = token.name as string
  try {
    const { categorie, note } = await req.json()
    const session = await startTimeSession(username, categorie || 'Travail', note || '')
    return NextResponse.json(session)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
