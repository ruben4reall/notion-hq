import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/auth'
import { getClient } from '@/lib/db'

export async function GET(req: NextRequest) {
  if (!(await isSuperAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getClient()

  const [tasksRes, notesRes, chatRes, crmRes, ideasRes, orgsRes] = await Promise.allSettled([
    db.from('tasks').select('id, title, assigned_to, created_at, org_id').order('created_at', { ascending: false }).limit(12),
    db.from('notes').select('id, titre, utilisateur, created_at, org_id').order('created_at', { ascending: false }).limit(12),
    db.from('chat_messages').select('id, author, message, created_at').order('created_at', { ascending: false }).limit(12),
    db.from('crm').select('id, enseigne, created_at, org_id').order('created_at', { ascending: false }).limit(12),
    db.from('ideas').select('id, title, created_at, org_id').order('created_at', { ascending: false }).limit(12),
    db.from('organizations').select('id, name'),
  ])

  const orgMap: Record<string, string> = {}
  if (orgsRes.status === 'fulfilled') {
    for (const o of (orgsRes.value.data as Array<{ id: string; name: string }> || [])) orgMap[o.id] = o.name
  }

  const entries: any[] = []

  if (tasksRes.status === 'fulfilled') {
    for (const t of (tasksRes.value.data as any[]) || []) entries.push({
      type: 'task', title: t.title, author: t.assigned_to || '—',
      project: t.org_id ? orgMap[t.org_id] : undefined, created_at: t.created_at,
    })
  }
  if (notesRes.status === 'fulfilled') {
    for (const n of (notesRes.value.data as any[]) || []) entries.push({
      type: 'note', title: n.titre, author: n.utilisateur,
      project: n.org_id ? orgMap[n.org_id] : undefined, created_at: n.created_at,
    })
  }
  if (chatRes.status === 'fulfilled') {
    for (const c of (chatRes.value.data as any[]) || []) entries.push({
      type: 'chat', title: c.message?.slice(0, 60) || '', author: c.author,
      project: undefined, created_at: c.created_at,
    })
  }
  if (crmRes.status === 'fulfilled') {
    for (const c of (crmRes.value.data as any[]) || []) entries.push({
      type: 'crm', title: c.enseigne, author: '—',
      project: c.org_id ? orgMap[c.org_id] : undefined, created_at: c.created_at,
    })
  }
  if (ideasRes.status === 'fulfilled') {
    for (const i of (ideasRes.value.data as any[]) || []) entries.push({
      type: 'idea', title: i.title, author: '—',
      project: i.org_id ? orgMap[i.org_id] : undefined, created_at: i.created_at,
    })
  }

  entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json(entries.slice(0, 40))
}
