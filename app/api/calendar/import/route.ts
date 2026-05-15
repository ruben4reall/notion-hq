import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getUserSettings, updateUserSettings } from '@/lib/db'

// Unfold RFC 5545 folded lines, then parse VEVENT blocks
function parseIcal(text: string) {
  const unfolded = text
    .replace(/\r\n[ \t]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  const lines = unfolded.split('\n')
  const events: {
    id: string
    title: string
    type: string
    dateStart: string
    dateEnd: string
    description: string
    modifiedBy: string
    lastEdited: string
    createdAt: string
    source: 'external'
  }[] = []

  let current: Record<string, string> | null = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {}
    } else if (line === 'END:VEVENT' && current) {
      const rawStart = current['DTSTART'] || ''
      const rawEnd = current['DTEND'] || ''

      const dateStart = parseIcalDate(rawStart)
      let dateEnd = parseIcalDate(rawEnd)

      // iCal all-day DTEND is exclusive (next day) — subtract 1 day
      if (dateEnd && rawEnd.length === 8) {
        const d = new Date(dateEnd + 'T00:00:00')
        d.setDate(d.getDate() - 1)
        dateEnd = d.toISOString().split('T')[0]
      }

      if (dateStart && current['SUMMARY']) {
        events.push({
          id: `ext-${current['UID'] || Math.random().toString(36).slice(2)}`,
          title: unescapeIcal(current['SUMMARY']),
          type: 'Autre',
          dateStart,
          dateEnd: dateEnd || dateStart,
          description: unescapeIcal(current['DESCRIPTION'] || ''),
          modifiedBy: 'iCal',
          lastEdited: '',
          createdAt: '',
          source: 'external',
        })
      }
      current = null
    } else if (current !== null) {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      // Key can be DTSTART, DTSTART;VALUE=DATE, DTSTART;TZID=Europe/Paris etc.
      const keyFull = line.slice(0, colonIdx)
      const key = keyFull.split(';')[0]
      const val = line.slice(colonIdx + 1)
      current[key] = val
    }
  }

  return events
}

function parseIcalDate(val: string): string {
  if (!val) return ''
  // Strip time portion: T100000Z or T100000+0100 etc.
  const dateOnly = val.replace(/T\d{6}(Z|[+-]\d{4})?$/, '')
  if (/^\d{8}$/.test(dateOnly)) {
    return `${dateOnly.slice(0, 4)}-${dateOnly.slice(4, 6)}-${dateOnly.slice(6, 8)}`
  }
  return ''
}

function unescapeIcal(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await getUserSettings(token.name as string).catch(() => null)
  const feedUrl = settings?.icalFeedUrl

  if (!feedUrl) return NextResponse.json({ events: [], connected: false })

  try {
    // webcal:// → https://
    const url = feedUrl.replace(/^webcal:\/\//i, 'https://')

    const res = await fetch(url, {
      headers: { 'User-Agent': 'ManagerDashboard/1.0' },
      next: { revalidate: 300 }, // cache 5 min
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Feed returned ${res.status}`, events: [], connected: true }, { status: 200 })
    }

    const text = await res.text()
    const events = parseIcal(text)

    return NextResponse.json({ events, connected: true })
  } catch (err) {
    console.error('iCal import error:', err)
    return NextResponse.json({ error: 'Failed to fetch feed', events: [], connected: true }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json()
  const feedUrl = url ? String(url).trim().slice(0, 1000) : null

  await updateUserSettings(token.name as string, { icalFeedUrl: feedUrl })
  return NextResponse.json({ ok: true })
}
