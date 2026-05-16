import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Task, CRMEntry, Idea, CalendarEvent } from './types'
import type { Database } from './database.types'

type DB = Database['public']['Tables']

let _client: SupabaseClient<Database> | null = null

export function getClient(): SupabaseClient<Database> {
  if (!_client) {
    _client = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
  }
  return _client
}

// ── TASKS ────────────────────────────────────────────────────────────────────

export async function getTasks(orgId: string): Promise<Task[]> {
  const { data, error } = await getClient()
    .from('tasks')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data || []).map(r => ({
    id: r.id,
    title: r.title,
    status: r.status as Task['status'],
    priority: r.priority as Task['priority'],
    module: r.module as Task['module'],
    description: r.description,
    dateStart: r.date_start || '',
    dateEnd: r.date_end || '',
    assignedTo: r.assigned_to || '',
    modifiedBy: r.modified_by,
    lastEdited: r.updated_at,
    createdAt: r.created_at,
  }))
}

export async function createTask(orgId: string, data: Partial<Task> & { modifiedBy?: string }): Promise<void> {
  const { error } = await getClient().from('tasks').insert({
    org_id: orgId,
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
  const u: DB['tasks']['Update'] = {}
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

export async function getCRM(orgId: string): Promise<CRMEntry[]> {
  const { data, error } = await getClient()
    .from('crm')
    .select('*')
    .eq('org_id', orgId)
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
    status: r.status as CRMEntry['status'],
    canal: r.canal,
    type: r.type,
    priority: r.priority as CRMEntry['priority'],
    notes: r.notes,
    lastContact: r.last_contact || '',
    nextFollowup: r.next_followup || '',
    assignedTo: r.assigned_to || '',
    modifiedBy: r.modified_by,
    lastEdited: r.updated_at,
  }))
}

export async function createCRM(orgId: string, data: Partial<CRMEntry> & { modifiedBy?: string }): Promise<void> {
  const { error } = await getClient().from('crm').insert({
    org_id: orgId,
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
  const u: DB['crm']['Update'] = {}
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

export async function getIdeas(orgId: string): Promise<Idea[]> {
  const { data, error } = await getClient()
    .from('ideas')
    .select('*')
    .eq('org_id', orgId)
    .order('votes', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data || []).map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status as Idea['status'],
    category: r.category,
    effort: r.effort as Idea['effort'],
    votes: r.votes,
    assignedTo: r.assigned_to || '',
    modifiedBy: r.modified_by,
    lastEdited: r.updated_at,
  }))
}

export async function createIdea(orgId: string, data: Partial<Idea> & { modifiedBy?: string }): Promise<void> {
  const { error } = await getClient().from('ideas').insert({
    org_id: orgId,
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
  const u: DB['ideas']['Update'] = {}
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

export async function getEvents(orgId: string): Promise<CalendarEvent[]> {
  const { data, error } = await getClient()
    .from('events')
    .select('*')
    .eq('org_id', orgId)
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
    source: 'supabase' as const,
  }))
}

export async function createEvent(orgId: string, data: Partial<CalendarEvent> & { modifiedBy?: string }): Promise<void> {
  const { error } = await getClient().from('events').insert({
    org_id: orgId,
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
  const u: DB['events']['Update'] = {}
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

export async function getNotifications(userName: string, userEmail: string): Promise<Notification[]> {
  const { data, error } = await getClient()
    .from('notifications')
    .select('*')
    // Broadcast (Tous) only if NOT sent by this user; direct (pour=me) always shown
    .or(`and(pour.eq.Tous,de.neq.${userName}),pour.eq.${userName},pour.eq.${userEmail}`)
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
  connectedAt: string
  online: boolean
  avatarUrl: string | null
}

export async function getPresence(filterUsernames?: string[]): Promise<PresenceEntry[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString()
  let query = (getClient().from('presence') as any)
    .select('id, username, last_seen, connected_at, avatar_url')
    .gte('last_seen', thirtyDaysAgo)
    .limit(20)
  if (filterUsernames && filterUsernames.length > 0) {
    query = query.in('username', filterUsernames)
  }
  const { data, error } = await query
  if (error) throw error
  return ((data as any[]) || []).map((r: any) => {
    const online = Date.now() - new Date(r.last_seen).getTime() < 2 * 60 * 1000
    return {
      id: r.id,
      username: r.username,
      lastSeen: r.last_seen,
      connectedAt: r.connected_at || r.last_seen,
      online,
      avatarUrl: r.avatar_url ?? null,
    }
  })
}

export async function upsertPresence(username: string): Promise<void> {
  const now = new Date().toISOString()
  // Single upsert: connected_at uses coalesce so it keeps existing value unless row is new
  const { error } = await getClient().from('presence').upsert(
    { username, last_seen: now, connected_at: now },
    {
      onConflict: 'username',
      // Only update last_seen; connected_at stays unless truly reconnecting
      // (handled client-side by sending connected_at explicitly when needed)
      ignoreDuplicates: false,
    }
  )
  if (error) throw error
}

// ── USER SETTINGS ─────────────────────────────────────────────────────────────

export interface UserSettings {
  displayName: string | null
  passwordOverride: string | null
  icalFeedUrl: string | null
  avatarUrl: string | null
  language: string | null
}

export async function getUserSettings(name: string): Promise<UserSettings | null> {
  const { data } = await (getClient().from('presence') as any)
    .select('display_name, password_override, ical_feed_url, avatar_url, language')
    .eq('username', name)
    .maybeSingle()
  if (!data) return null
  const d = data as any
  return {
    displayName: d.display_name ?? null,
    passwordOverride: d.password_override ?? null,
    icalFeedUrl: d.ical_feed_url ?? null,
    avatarUrl: d.avatar_url ?? null,
    language: d.language ?? null,
  }
}

export async function updateUserSettings(name: string, settings: Partial<UserSettings>): Promise<void> {
  const u: DB['presence']['Update'] = {}
  if (settings.displayName !== undefined)      u.display_name = settings.displayName
  if (settings.passwordOverride !== undefined) u.password_override = settings.passwordOverride
  if (settings.icalFeedUrl !== undefined)      u.ical_feed_url = settings.icalFeedUrl
  if (settings.avatarUrl !== undefined)        (u as any).avatar_url = settings.avatarUrl
  if (settings.language !== undefined)         (u as any).language = settings.language
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

export async function getChatMessages(orgId: string, limit = 100): Promise<ChatMessage[]> {
  const { data, error } = await getClient()
    .from('chat_messages')
    .select('*')
    .eq('org_id', orgId)
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

export async function sendChatMessage(orgId: string, author: string, message: string, destinataire = ''): Promise<void> {
  const { error } = await getClient().from('chat_messages').insert({
    org_id: orgId,
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
  sharedWith: string[]
  createdAt: string
  updatedAt: string
}

type NoteRow = Pick<DB['notes']['Row'], 'id' | 'titre' | 'contenu' | 'utilisateur' | 'shared_with' | 'created_at' | 'updated_at'>

function mapNote(r: NoteRow): Note {
  return {
    id: r.id,
    titre: r.titre,
    contenu: r.contenu,
    utilisateur: r.utilisateur,
    sharedWith: r.shared_with || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function getNotes(orgId: string, utilisateur: string): Promise<Note[]> {
  const { data, error } = await getClient()
    .from('notes')
    .select('id, titre, contenu, utilisateur, shared_with, created_at, updated_at')
    .eq('org_id', orgId)
    .or(`utilisateur.eq.${utilisateur},shared_with.cs.{"${utilisateur}"}`)
    .order('updated_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data || []).map(mapNote)
}

export async function getNote(id: string): Promise<Note | null> {
  const { data } = await getClient()
    .from('notes')
    .select('id, titre, contenu, utilisateur, shared_with, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  return mapNote(data)
}

export async function createNote(orgId: string, utilisateur: string, titre: string, contenu: string): Promise<Note> {
  const { data, error } = await getClient()
    .from('notes')
    .insert({ org_id: orgId, utilisateur, titre, contenu })
    .select('id, titre, contenu, utilisateur, shared_with, created_at, updated_at')
    .single()
  if (error) throw error
  return mapNote(data)
}

export async function updateNote(id: string, data: { titre?: string; contenu?: string }): Promise<void> {
  const { error } = await getClient().from('notes').update(data).eq('id', id)
  if (error) throw error
}

export async function shareNote(id: string, ownerName: string, sharedWith: string[]): Promise<void> {
  const { error } = await getClient()
    .from('notes')
    .update({ shared_with: sharedWith })
    .eq('id', id)
    .eq('utilisateur', ownerName)
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

export async function getTimeSessions(orgId: string, utilisateur: string, days = 7): Promise<TimeSession[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { data, error } = await getClient()
    .from('time_sessions')
    .select('*')
    .eq('org_id', orgId)
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

export async function getActiveSession(orgId: string, utilisateur: string): Promise<TimeSession | null> {
  const { data } = await getClient()
    .from('time_sessions')
    .select('*')
    .eq('org_id', orgId)
    .eq('utilisateur', utilisateur)
    .is('fin', null)
    .order('debut', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return { id: data.id, utilisateur: data.utilisateur, categorie: data.categorie, debut: data.debut, fin: null, duree: null, note: data.note, createdAt: data.created_at }
}

export async function startTimeSession(orgId: string, utilisateur: string, categorie: string, note = ''): Promise<TimeSession> {
  const active = await getActiveSession(orgId, utilisateur)
  if (active) await stopTimeSession(active.id)

  const { data, error } = await getClient()
    .from('time_sessions')
    .insert({ org_id: orgId, utilisateur, categorie, note, debut: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return { id: data.id, utilisateur: data.utilisateur, categorie: data.categorie, debut: data.debut, fin: null, duree: null, note: data.note, createdAt: data.created_at }
}

export async function stopTimeSession(id: string): Promise<void> {
  const fin = new Date().toISOString()
  // SELECT+UPDATE in one round-trip: get debut from the update's RETURNING
  const { data } = await getClient()
    .from('time_sessions')
    .select('debut')
    .eq('id', id)
    .is('fin', null)
    .maybeSingle()
  if (!data) return
  const duree = Math.round((new Date(fin).getTime() - new Date(data.debut).getTime()) / 60000)
  await getClient().from('time_sessions').update({ fin, duree }).eq('id', id)
}
