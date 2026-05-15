import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()

  // Validate OAuth state to prevent CSRF
  const expectedState = cookieStore.get('gcal_state')?.value
  const receivedState = req.nextUrl.searchParams.get('state')
  cookieStore.delete('gcal_state')

  if (!expectedState || expectedState !== receivedState) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/calendar?error=state_mismatch`)
  }

  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/calendar?error=no_code`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/google-calendar/callback`

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    })

    const tokens = await res.json()
    if (!tokens.access_token) throw new Error('No token received')

    cookieStore.set('gcal_token', tokens.access_token, { httpOnly: true, secure: true, maxAge: tokens.expires_in ?? 3600, path: '/' })
    if (tokens.refresh_token) {
      cookieStore.set('gcal_refresh', tokens.refresh_token, { httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 30, path: '/' })
    }

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/calendar?gcal=connected`)
  } catch (err) {
    console.error(err)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/calendar?error=auth_failed`)
  }
}
