import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Google Calendar non configuré' }, { status: 503 })
  }

  const cookieStore = await cookies()
  const state = crypto.randomBytes(16).toString('hex')
  cookieStore.set('gcal_state', state, { httpOnly: true, secure: true, maxAge: 600, path: '/' })

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/google-calendar/callback`
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.readonly')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)

  return NextResponse.redirect(url.toString())
}
