import { createClient } from '@supabase/supabase-js'
import type { Task, CRMEntry, Idea, CalendarEvent } from './types'

function getClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ── TASKS ────────────────────────────────────────────────────────────────────

export async function getTasks(): Promise<Task[]> {
  const { data, error } = await getClient()
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data || []).map(r => ({
    id: r.id,
    title: r.title,
    status: r.status,
    priority: r.priority,
    module: r.module,
    description: r.description,
    dateStart: r.date_start || '',
    dateEnd: r.date_end || '',
    assignedTo: r.assigned_to || '',
    modifiedBy: r.modified_by,
    lastEdited: r.updated_at,
    createdAt: r.created_at,
  }))
}

export async function createTask(data: Partial<Task> & { modifiedBy?: string }): Promise<void> {
  const { error } = await getClient().from('tasks').insert({
    title: data.title || '',
    status: data.status || 'Backlog',
    priority: data.priority || '',
    module: data.module || '',
    description: data.description || '',
    date_start: data.dateStart || null,
    date_end: data.dateEnd || null,
    assigned_to: data.assignedTo || '',
    modified_by: data.modifiedBy || '',
  })
  if (error) throw error
}

export async function updateTask(id: string, data: Partial<Task> & { modifiedBy?: string }): Promise<void> {
  const u: Record<string, unknown> = {}
  if (data.title !== undefined)       u.title = data.title
  if (data.status !== undefined)      u.status = data.status
  if (data.priority !== undefined)    u.priority = data.priority
  if (data.module !== undefined)      u.module = data.module
  if (data.description !== undefined) u.description = data.description
  if (data.dateStart !== undefined)   u.date_start = data.dateStart || null
  if (data.dateEnd !== undefined)     u.date_end = data.dateEnd || null
  if (data.assignedTo !== undefined)  u.assigned_to = data.assignedTo
  if (data.modifiedBy !== undefined)  u.modified_by = data.modifiedBy
  const { error } = await getClient().from('tasks').update(u).eq('id', id)
  if (error) throw error
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await getClient().from('tasks').delete().eq('id', id)
  if (error) throw error
}

export const updateTaskStatus = (id: string, status: string) =>
  updateTask(id, { status: status as Task['status'] })

// ── CRM ──────────────────────────────────────────────────────────────────────

export async function getCRM(): Promise<CRMEntry[]> {
  const { data, error } = await getClient()
    .from('crm')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data || []).map(r => ({
    id: r.id,
    enseigne: r.enseigne,
    contact: r.contact,
    email: r.email || '',
    phone: r.phone || '',
    ville: r.ville,
    status: r.status,
    canal: r.canal,
    type: r.type,
    priority: r.priority,
    notes: r.notes,
    lastContact: r.last_contact || '',
    nextFollowup: r.next_followup || '',
    assignedTo: r.assigned_to || '',
    modifiedBy: r.modified_by,
    lastEdited: r.updated_at,
  }))
}

export async function createCRM(data: Partial<CRMEntry> & { modifiedBy?: string }): Promise<void> {
  const { error } = await getClient().from('crm').insert({
    enseigne: data.enseigne || '',
    contact: data.contact || '',
    email: data.email || null,
    phone: data.phone || null,
    ville: data.ville || '',
    status: data.status || 'À contacter',
    canal: data.canal || '',
    type: data.type || '',
    priority: data.priority || '',
    notes: data.notes || '',
    last_contact: data.lastContact || null,
    next_followup: data.nextFollowup || null,
    assigned_to: data.assignedTo || '',
    modified_by: data.modifiedBy || '',
  })
  if (error) throw error
}

export async function updateCRM(id: string, data: Partial<CRMEntry> & { modifiedBy?: string }): Promise<void> {
  const u: Record<string, unknown> = {}
  if (data.enseigne !== undefined)     u.enseigne = data.enseigne
  if (data.status !== undefined)       u.status = data.status
  if (data.contact !== undefined)      u.contact = data.contact
  if (data.email !== undefined)        u.email = data.email || null
  if (data.phone !== undefined)        u.phone = data.phone || null
  if (data.ville !== undefined)        u.ville = data.ville
  if (data.canal !== undefined)        u.canal = data.canal
  if (data.type !== undefined)         u.type = data.type
  if (data.priority !== undefined)     u.priority = data.priority
  if (data.notes !== undefined)        u.notes = data.notes
  if (data.lastContact !== undefined)  u.last_contact = data.lastContact || null
  if (data.nextFollowup !== undefined) u.next_followup = data.nextFollowup || null
  if (data.assignedTo !== undefined)   u.assigned_to = data.assignedTo
  if (data.modifiedBy !== undefined)   u.modified_by = data.modifiedBy
  const { error } = await getClient().from('crm').update(u).eq('id', id)
  if (error) throw error
}

export async function deleteCRM(id: string): Promise<void> {
  const { error } = await getClient().from('crm').delete().eq('id', id)
  if (error) throw error
}

export const updateCRMStatus = (id: string, status: string) =>
  updateCRM(id, { status: status as CRMEntry['status'] })

// ── IDEAS ─────────────────────────────────────────────────────────────────────

export async function getIdeas(): Promise<Idea[]> {
  const { data, error } = await getClient()
    .from('ideas')
    .select('*')
    .order('votes', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data || []).map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    category: r.category,
    effort: r.effort,
    votes: r.votes,
    assignedTo: r.assigned_to || '',
    modifiedBy: r.modified_by,
    lastEdited: r.updated_at,
  }))
}

export async function createIdea(data: Partial<Idea> & { modifiedBy?: string }): Promise<void> {
  const { error } = await getClient().from('ideas').insert({
    title: data.title || '',
    description: data.description || '',
    status: data.status || 'Brute',
    category: data.category || '',
    effort: data.effort || '',
    votes: data.votes ?? 0,
    assigned_to: data.assignedTo || '',
    modified_by: data.modifiedBy || '',
  })
  if (error) throw error
}

export async function updateIdea(id: string, data: Partial<Idea> & { modifiedBy?: string }): Promise<void> {
  const u: Record<string, unknown> = {}
  if (data.title !== undefined)       u.title = data.title
  if (data.status !== undefined)      u.status = data.status
  if (data.description !== undefined) u.description = data.description
  if (data.category !== undefined)    u.category = data.category
  if (data.effort !== undefined)      u.effort = data.effort
  if (data.votes !== undefined)       u.votes = data.votes
  if (data.assignedTo !== undefined)  u.assigned_to = data.assignedTo
  if (data.modifiedBy !== undefined)  u.modified_by = data.modifiedBy
  const { error } = await getClient().from('ideas').update(u).eq('id', id)
  if (error) throw error
}

export async function deleteIdea(id: string): Promise<void> {
  const { error } = await getClient().from('ideas').delete().eq('id', id)
  if (error) throw error
}

export const updateIdeaVotes = (id: string, votes: number) => updateIdea(id, { votes })

// ── EVENTS ───────────────────────────────────────────────────────────────────

export async function getEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await getClient()
    .from('events')
    .select('*')
    .order('date_start', { ascending: true })
    .limit(200)
  if (error) throw error
  return (data || []).map(r => ({
    id: r.id,
    title: r.title,
    dateStart: r.date_start || '',
    dateEnd: r.date_end || '',
    type: (r.type || 'Autre') as CalendarEvent['type'],
    description: r.description,
    modifiedBy: r.modified_by,
    source: 'notion' as const,
  }))
}

export async function createEvent(data: Partial<CalendarEvent> & { modifiedBy?: string }): Promise<void> {
  const { error } = await getClient().from('events').insert({
    title: data.title || '',
    date_start: data.dateStart || null,
    date_end: data.dateEnd || null,
    type: data.type || 'Autre',
    description: data.description || '',
    modified_by: data.modifiedBy || '',
  })
  if (error) throw error
}

export async function updateEvent(id: string, data: Partial<CalendarEvent> & { modifiedBy?: string }): Promise<void> {
  const u: Record<string, unknown> = {}
  if (data.title !== undefined)       u.title = data.title
  if (data.type !== undefined)        u.type = data.type
  if (data.dateStart !== undefined)   u.date_start = data.dateStart || null
  if (data.dateEnd !== undefined)     u.date_end = data.dateEnd || null
  if (data.description !== undefined) u.description = data.description
  if (data.modifiedBy !== undefined)  u.modified_by = data.modifiedBy
  const { error } = await getClient().from('events').update(u).eq('id', id)
  if (error) throw error
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await getClient().from('events').delete().eq('id', id)
  if (error) throw error
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  lu: boolean
  de: string
  pour: string
  createdAt: string
}

export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await getClient()
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return (data || []).map(r => ({
    id: r.id,
    message: r.message,
    type: r.type as Notification['type'],
    lu: r.lu,
    de: r.de,
    pour: r.pour,
    createdAt: r.created_at,
  }))
}

export async function createNotification(data: { message: string; type: Notification['type']; de: string; pour?: string }): Promise<void> {
  const { error } = await getClient().from('notifications').insert({
    message: data.message,
    type: data.type,
    lu: false,
    de: data.de,
    pour: data.pour || 'Tous',
  })
  if (error) throw error
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  const { error } = await getClient()
    .from('notifications')
    .update({ lu: true })
    .in('id', ids)
  if (error) throw error
}

// ── PRESENCE ─────────────────────────────────────────────────────────────────

export interface PresenceEntry {
  id: string
  username: string
  lastSeen: string
  online: boolean
}

export async function getPresence(): Promise<PresenceEntry[]> {
  const { data, error } = await getClient()
    .from('presence')
    .select('id, username, last_seen')
    .limit(10)
  if (error) throw error
  return (data || []).map(r => {
    const online = Date.now() - new Date(r.last_seen).getTime() < 2 * 60 * 1000
    return { id: r.id, username: r.username, lastSeen: r.last_seen, online }
  })
}

export async function upsertPresence(username: string): Promise<void> {
  const { error } = await getClient()
    .from('presence')
    .upsert({ username, last_seen: new Date().toISOString() }, { onConflict: 'username' })
  if (error) throw error
}

// ── USER SETTINGS ─────────────────────────────────────────────────────────────

export interface UserSettings {
  displayName: string | null
  passwordOverride: string | null
  icalFeedUrl: string | null
}

export async function getUserSettings(name: string): Promise<UserSettings | null> {
  const { data } = await getClient()
    .from('presence')
    .select('display_name, password_override, ical_feed_url')
    .eq('username', name)
    .maybeSingle()
  if (!data) return null
  return {
    displayName: data.display_name ?? null,
    passwordOverride: data.password_override ?? null,
    icalFeedUrl: data.ical_feed_url ?? null,
  }
}

export async function updateUserSettings(name: string, settings: Partial<UserSettings>): Promise<void> {
  const u: Record<string, unknown> = {}
  if (settings.displayName !== undefined)      u.display_name = settings.displayName
  if (settings.passwordOverride !== undefined) u.password_override = settings.passwordOverride
  if (settings.icalFeedUrl !== undefined)      u.ical_feed_url = settings.icalFeedUrl
  const { error } = await getClient()
    .from('presence')
    .upsert({ username: name, last_seen: new Date().toISOString(), ...u }, { onConflict: 'username' })
  if (error) throw error
}

// ── CHAT ──────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  author: string
  message: string
  destinataire: string
  createdAt: string
}

export async function getChatMessages(limit = 100): Promise<ChatMessage[]> {
  const { data, error } = await getClient()
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data || []).map(r => ({
    id: r.id,
    author: r.author,
    message: r.message,
    destinataire: r.destinataire,
    createdAt: r.created_at,
  }))
}

export async function sendChatMessage(author: string, message: string, destinataire = ''): Promise<void> {
  const { error } = await getClient().from('chat_messages').insert({
    author,
    message: message.trim(),
    destinataire,
  })
  if (error) throw error
}

// ── NOTES ────────────────────────────────────────────────────────────────────

export interface Note {
  id: string
  titre: string
  contenu: string
  utilisateur: string
  createdAt: string
  updatedAt: string
}

export async function getNotes(utilisateur: string): Promise<Note[]> {
  const { data, error } = await getClient()
    .from('notes')
    .select('id, titre, contenu, utilisateur, created_at, updated_at')
    .eq('utilisateur', utilisateur)
    .order('updated_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data || []).map(r => ({
    id: r.id,
    titre: r.titre,
    contenu: r.contenu,
    utilisateur: r.utilisateur,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

export async function getNote(id: string): Promise<Note | null> {
  const { data } = await getClient()
    .from('notes')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  return { id: data.id, titre: data.titre, contenu: data.contenu, utilisateur: data.utilisateur, createdAt: data.created_at, updatedAt: data.updated_at }
}

export async function createNote(utilisateur: string, titre: string, contenu: string): Promise<Note> {
  const { data, error } = await getClient()
    .from('notes')
    .insert({ utilisateur, titre, contenu })
    .select()
    .single()
  if (error) throw error
  return { id: data.id, titre: data.titre, contenu: data.contenu, utilisateur: data.utilisateur, createdAt: data.created_at, updatedAt: data.updated_at }
}

export async function updateNote(id: string, data: { titre?: string; contenu?: string }): Promise<void> {
  const { error } = await getClient().from('notes').update(data).eq('id', id)
  if (error) throw error
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await getClient().from('notes').delete().eq('id', id)
  if (error) throw error
}

// ── TIME SESSIONS ─────────────────────────────────────────────────────────────

export interface TimeSession {
  id: string
  utilisateur: string
  categorie: string
  debut: string
  fin: string | null
  duree: number | null
  note: string
  createdAt: string
}

export async function getTimeSessions(utilisateur: string, days = 7): Promise<TimeSession[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { data, error } = await getClient()
    .from('time_sessions')
    .select('*')
    .eq('utilisateur', utilisateur)
    .gte('debut', since)
    .order('debut', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data || []).map(r => ({
    id: r.id,
    utilisateur: r.utilisateur,
    categorie: r.categorie,
    debut: r.debut,
    fin: r.fin,
    duree: r.duree,
    note: r.note,
    createdAt: r.created_at,
  }))
}

export async function getActiveSession(utilisateur: string): Promise<TimeSession | null> {
  const { data } = await getClient()
    .from('time_sessions')
    .select('*')
    .eq('utilisateur', utilisateur)
    .is('fin', null)
    .order('debut', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return { id: data.id, utilisateur: data.utilisateur, categorie: data.categorie, debut: data.debut, fin: null, duree: null, note: data.note, createdAt: data.created_at }
}

export async function startTimeSession(utilisateur: string, categorie: string, note = ''): Promise<TimeSession> {
  // Stop any existing active session first
  const active = await getActiveSession(utilisateur)
  if (active) await stopTimeSession(active.id)

  const { data, error } = await getClient()
    .from('time_sessions')
    .insert({ utilisateur, categorie, note, debut: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return { id: data.id, utilisateur: data.utilisateur, categorie: data.categorie, debut: data.debut, fin: null, duree: null, note: data.note, createdAt: data.created_at }
}

export async function stopTimeSession(id: string): Promise<void> {
  const { data } = await getClient().from('time_sessions').select('debut').eq('id', id).maybeSingle()
  if (!data) return
  const fin = new Date().toISOString()
  const duree = Math.round((new Date(fin).getTime() - new Date(data.debut).getTime()) / 60000)
  await getClient().from('time_sessions').update({ fin, duree }).eq('id', id)
}
