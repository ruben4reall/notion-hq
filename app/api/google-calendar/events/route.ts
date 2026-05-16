import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

async function refreshToken(refreshToken: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token ?? null
}

export async function GET(_req: NextRequest) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json({ events: [], connected: false })
  }

  const cookieStore = await cookies()
  let token = cookieStore.get('gcal_token')?.value
  const refresh = cookieStore.get('gcal_refresh')?.value

  if (!token && refresh) {
    token = await refreshToken(refresh) ?? undefined
    if (token) {
      cookieStore.set('gcal_token', token, { httpOnly: true, secure: true, maxAge: 3600, path: '/' })
    }
  }

  if (!token) {
    return NextResponse.json({ events: [], connected: false })
  }

  try {
    const now = new Date()
    const min = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const max = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${min}&timeMax=${max}&singleEvents=true&orderBy=startTime&maxResults=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json({ events: [], connected: false, expired: true })
      }
      throw new Error(`Google API error: ${res.status}`)
    }

    const data = await res.json()
    const events = (data.items ?? []).map((e: any) => ({
      id: e.id,
      title: e.summary || '(Sans titre)',
      dateStart: e.start?.date || e.start?.dateTime?.split('T')[0] || '',
      dateEnd: e.end?.date || e.end?.dateTime?.split('T')[0] || '',
      type: 'Autre',
      description: e.description || '',
      modifiedBy: '',
      source: 'google',
      color: '#4285f4',
    }))

    return NextResponse.json({ events, connected: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ events: [], connected: false })
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('gcal_token')
  cookieStore.delete('gcal_refresh')
  return NextResponse.json({ ok: true })
}
