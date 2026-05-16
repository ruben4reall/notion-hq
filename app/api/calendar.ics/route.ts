import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient } from '@/lib/db'

function icalDateOnly(iso: string) {
  return iso.replace(/-/g, '')
}

function escapeIcal(str: string) {
  return (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function foldLine(line: string): string {
  const result: string[] = []
  while (line.length > 75) {
    result.push(line.slice(0, 75))
    line = ' ' + line.slice(75)
  }
  result.push(line)
  return result.join('\r\n')
}

async function resolveUser(req: NextRequest) {
  // Cookie-based auth (browser preview)
  const cookieUser = await getUser(req)
  if (cookieUser) return cookieUser

  // Token-based auth for iCal clients (?token=<access_token>)
  const token = req.nextUrl.searchParams.get('token')
    || req.headers.get('authorization')?.replace(/^Bearer /i, '')
  if (!token) return null

  const db = getClient()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return null
  return {
    id: user.id,
    email: user.email!,
    name: (user.user_metadata?.full_name as string) || user.email!,
    color: (user.user_metadata?.color as string) || '#7c6af5',
  }
}

export async function GET(req: NextRequest) {
  const user = await resolveUser(req)
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  try {
    const db = getClient()

    // Get orgs the user belongs to
    const { data: memberships } = await db
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)

    const orgIds = (memberships || []).map(m => m.org_id).filter((id): id is string => !!id)
    if (!orgIds.length) {
      const ical = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Manager Dashboard//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'END:VCALENDAR'].join('\r\n')
      return new NextResponse(ical, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-cache, max-age=0' } })
    }

    const [tasksRes, eventsRes] = await Promise.all([
      db.from('tasks').select('*').in('org_id', orgIds).not('date_start', 'is', null).limit(500),
      db.from('events').select('*').in('org_id', orgIds).limit(500),
    ])

    const tasks = (tasksRes.data || []).map((r: Record<string, unknown>) => ({
      id: String(r.id), title: String(r.title || ''), status: String(r.status || ''),
      priority: String(r.priority || ''), module: String(r.module || ''),
      description: String(r.description || ''),
      dateStart: String(r.date_start || ''), dateEnd: String(r.date_end || ''),
      modifiedBy: String(r.modified_by || ''),
    }))
    const events = (eventsRes.data || []).map((r: Record<string, unknown>) => ({
      id: String(r.id), title: String(r.title || ''), type: String(r.type || 'Autre'),
      dateStart: String(r.date_start || ''), dateEnd: String(r.date_end || ''),
      description: String(r.description || ''),
    }))

    const lines: string[] = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Manager Dashboard//FR',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Manager Dashboard',
      'X-WR-TIMEZONE:Europe/Paris', 'X-WR-CALDESC:Tâches et évènements Manager Dashboard',
    ]

    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

    const STATUS_EMOJI: Record<string, string> = {
      'Backlog': '⬜', 'À faire': '🔵', 'En cours': '🟣', 'Review': '🟡', 'Done': '✅',
    }

    for (const task of tasks) {
      if (!task.dateStart && !task.dateEnd) continue
      const uid = `task-${task.id}@manager-dashboard`
      const emoji = STATUS_EMOJI[task.status] || '📋'
      const summary = `${emoji} [${task.status}] ${task.title}`
      const desc = [
        task.description, task.module ? `Module: ${task.module}` : '',
        task.priority ? `Priorité: ${task.priority}` : '',
        task.modifiedBy ? `Modifié par: ${task.modifiedBy}` : '',
      ].filter(Boolean).join('\\n')

      lines.push('BEGIN:VEVENT')
      lines.push(foldLine(`UID:${uid}`))
      lines.push(`DTSTAMP:${now}Z`)
      if (task.dateStart) lines.push(foldLine(`DTSTART;VALUE=DATE:${icalDateOnly(task.dateStart)}`))
      if (task.dateEnd) {
        const endDate = new Date(task.dateEnd); endDate.setDate(endDate.getDate() + 1)
        lines.push(foldLine(`DTEND;VALUE=DATE:${icalDateOnly(endDate.toISOString().split('T')[0])}`))
      } else if (task.dateStart) {
        const endDate = new Date(task.dateStart); endDate.setDate(endDate.getDate() + 1)
        lines.push(foldLine(`DTEND;VALUE=DATE:${icalDateOnly(endDate.toISOString().split('T')[0])}`))
      }
      lines.push(foldLine(`SUMMARY:${escapeIcal(summary)}`))
      if (desc) lines.push(foldLine(`DESCRIPTION:${escapeIcal(desc)}`))
      lines.push(`STATUS:${task.status === 'Done' ? 'COMPLETED' : 'CONFIRMED'}`)
      lines.push('END:VEVENT')
    }

    const TYPE_EMOJI: Record<string, string> = { RDV: '🔷', Réunion: '🟤', Appel: '📞', Deadline: '🔴', Autre: '📅' }

    for (const event of events) {
      if (!event.dateStart) continue
      const uid = `event-${event.id}@manager-dashboard`
      const emoji = TYPE_EMOJI[event.type] || '📅'
      lines.push('BEGIN:VEVENT')
      lines.push(foldLine(`UID:${uid}`))
      lines.push(`DTSTAMP:${now}Z`)
      lines.push(foldLine(`DTSTART;VALUE=DATE:${icalDateOnly(event.dateStart)}`))
      if (event.dateEnd) {
        const endDate = new Date(event.dateEnd); endDate.setDate(endDate.getDate() + 1)
        lines.push(foldLine(`DTEND;VALUE=DATE:${icalDateOnly(endDate.toISOString().split('T')[0])}`))
      } else {
        const endDate = new Date(event.dateStart); endDate.setDate(endDate.getDate() + 1)
        lines.push(foldLine(`DTEND;VALUE=DATE:${icalDateOnly(endDate.toISOString().split('T')[0])}`))
      }
      lines.push(foldLine(`SUMMARY:${escapeIcal(`${emoji} [${event.type}] ${event.title}`)}`))
      if (event.description) lines.push(foldLine(`DESCRIPTION:${escapeIcal(event.description)}`))
      lines.push('STATUS:CONFIRMED')
      lines.push('END:VEVENT')
    }

    lines.push('END:VCALENDAR')

    return new NextResponse(lines.join('\r\n'), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="manager-dashboard.ics"',
        'Cache-Control': 'no-cache, max-age=0',
      },
    })
  } catch (err) {
    console.error(err)
    return new NextResponse('Internal error', { status: 500 })
  }
}
