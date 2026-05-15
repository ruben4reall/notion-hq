import { NextResponse } from 'next/server'
import { getTasks, getEvents } from '@/lib/db'

function icalDate(iso: string) {
  if (!iso) return ''
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace('T', 'T')
}

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

export async function GET() {
  try {
    const [tasks, events] = await Promise.all([getTasks(), getEvents()])

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Manager Dashboard//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Manager Dashboard',
      'X-WR-TIMEZONE:Europe/Paris',
      'X-WR-CALDESC:Tâches et évènements Manager Dashboard',
    ]

    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

    const STATUS_EMOJI: Record<string, string> = {
      'Backlog': '⬜',
      'À faire': '🔵',
      'En cours': '🟣',
      'Review': '🟡',
      'Done': '✅',
    }

    // Tasks with dates
    for (const task of tasks) {
      if (!task.dateStart && !task.dateEnd) continue
      const uid = `task-${task.id}@manager-dashboard`
      const emoji = STATUS_EMOJI[task.status] || '📋'
      const summary = `${emoji} [${task.status}] ${task.title}`
      const desc = [
        task.description || '',
        task.module ? `Module: ${task.module}` : '',
        task.priority ? `Priorité: ${task.priority}` : '',
        task.modifiedBy ? `Modifié par: ${task.modifiedBy}` : '',
      ].filter(Boolean).join('\\n')

      lines.push('BEGIN:VEVENT')
      lines.push(foldLine(`UID:${uid}`))
      lines.push(`DTSTAMP:${now}Z`)
      if (task.dateStart) lines.push(foldLine(`DTSTART;VALUE=DATE:${icalDateOnly(task.dateStart)}`))
      if (task.dateEnd) {
        // Add 1 day to end date (iCal DTEND is exclusive)
        const endDate = new Date(task.dateEnd)
        endDate.setDate(endDate.getDate() + 1)
        lines.push(foldLine(`DTEND;VALUE=DATE:${icalDateOnly(endDate.toISOString().split('T')[0])}`))
      } else if (task.dateStart) {
        const endDate = new Date(task.dateStart)
        endDate.setDate(endDate.getDate() + 1)
        lines.push(foldLine(`DTEND;VALUE=DATE:${icalDateOnly(endDate.toISOString().split('T')[0])}`))
      }
      lines.push(foldLine(`SUMMARY:${escapeIcal(summary)}`))
      if (desc) lines.push(foldLine(`DESCRIPTION:${escapeIcal(desc)}`))
      lines.push(`STATUS:${task.status === 'Done' ? 'COMPLETED' : 'CONFIRMED'}`)
      lines.push('END:VEVENT')
    }

    // Calendar events (RDV, Réunions, etc.)
    const TYPE_COLORS: Record<string, string> = {
      RDV: '🔷',
      Réunion: '🟤',
      Appel: '📞',
      Deadline: '🔴',
      Autre: '📅',
    }

    for (const event of events) {
      if (!event.dateStart) continue
      const uid = `event-${event.id}@manager-dashboard`
      const emoji = TYPE_COLORS[event.type] || '📅'
      const summary = `${emoji} [${event.type}] ${event.title}`

      lines.push('BEGIN:VEVENT')
      lines.push(foldLine(`UID:${uid}`))
      lines.push(`DTSTAMP:${now}Z`)
      lines.push(foldLine(`DTSTART;VALUE=DATE:${icalDateOnly(event.dateStart)}`))
      if (event.dateEnd) {
        const endDate = new Date(event.dateEnd)
        endDate.setDate(endDate.getDate() + 1)
        lines.push(foldLine(`DTEND;VALUE=DATE:${icalDateOnly(endDate.toISOString().split('T')[0])}`))
      } else {
        const endDate = new Date(event.dateStart)
        endDate.setDate(endDate.getDate() + 1)
        lines.push(foldLine(`DTEND;VALUE=DATE:${icalDateOnly(endDate.toISOString().split('T')[0])}`))
      }
      lines.push(foldLine(`SUMMARY:${escapeIcal(summary)}`))
      if (event.description) lines.push(foldLine(`DESCRIPTION:${escapeIcal(event.description)}`))
      lines.push('STATUS:CONFIRMED')
      lines.push('END:VEVENT')
    }

    lines.push('END:VCALENDAR')

    const ical = lines.join('\r\n')

    return new NextResponse(ical, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="manager-dashboard.ics"',
        'Cache-Control': 'no-cache, max-age=0',
      },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
