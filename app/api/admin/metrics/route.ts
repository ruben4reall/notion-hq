import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/auth'
import { getClient } from '@/lib/db'

export async function GET(req: NextRequest) {
  if (!(await isSuperAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getClient()

  const [tasksRes, crmRes, ideasRes, eventsRes, notesRes, chatRes, timeRes, orgsRes, membersRes, usersRes] = await Promise.all([
    db.from('tasks').select('status'),
    db.from('crm').select('id', { count: 'exact', head: true }),
    db.from('ideas').select('id', { count: 'exact', head: true }),
    db.from('events').select('id', { count: 'exact', head: true }),
    db.from('notes').select('id', { count: 'exact', head: true }),
    db.from('chat_messages').select('id', { count: 'exact', head: true }),
    db.from('time_sessions').select('duree').not('duree', 'is', null),
    db.from('organizations').select('id', { count: 'exact', head: true }),
    db.from('org_members').select('id', { count: 'exact', head: true }),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const tasksByStatus = (tasksRes.data || []).reduce((acc: Record<string, number>, t: any) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  const totalSeconds = (timeRes.data || []).reduce((sum: number, s: any) => sum + (s.duree || 0), 0)

  return NextResponse.json({
    users: usersRes.data?.users?.length ?? 0,
    projects: orgsRes.count ?? 0,
    members: membersRes.count ?? 0,
    tasks: tasksRes.data?.length ?? 0,
    tasksByStatus,
    crm: crmRes.count ?? 0,
    notes: notesRes.count ?? 0,
    ideas: ideasRes.count ?? 0,
    events: eventsRes.count ?? 0,
    messages: chatRes.count ?? 0,
    totalHoursLogged: Math.round(totalSeconds / 3600),
  })
}
