import { Client } from '@notionhq/client'
import type { Task, CRMEntry, Idea, CalendarEvent } from './types'

const notion = new Client({ auth: process.env.NOTION_TOKEN! })

const DB = {
  TASKS:    process.env.NOTION_TASKS_DB!,
  CRM:      process.env.NOTION_CRM_DB!,
  IDEAS:    process.env.NOTION_IDEAS_DB!,
  EVENTS:   process.env.NOTION_EVENTS_DB!,
  NOTIFS:   process.env.NOTION_NOTIFS_DB!,
  PRESENCE: process.env.NOTION_PRESENCE_DB!,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = (p: any) => p?.title?.[0]?.plain_text ?? ''
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const s = (p: any) => p?.select?.name ?? ''
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const r = (p: any) => p?.rich_text?.[0]?.plain_text ?? ''
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (p: any) => p?.date?.start ?? ''
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const n = (p: any) => p?.number ?? 0

// ── TASKS ────────────────────────────────────────────────────────────────────

export async function getTasks(): Promise<Task[]> {
  const res = await notion.databases.query({ database_id: DB.TASKS, page_size: 100 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return res.results.map((p: any) => ({
    id: p.id,
    title: t(p.properties['Tâche']),
    status: s(p.properties['Statut']) as Task['status'],
    priority: s(p.properties['Priorité']) as Task['priority'],
    module: s(p.properties['Module']) as Task['module'],
    description: r(p.properties['Description']),
    dateStart: d(p.properties['Date de début']),
    dateEnd: d(p.properties['Date de fin']),
    modifiedBy: r(p.properties['Modifié par']),
    lastEdited: p.last_edited_time ?? '',
    createdAt: p.created_time ?? '',
  }))
}

export async function createTask(data: Partial<Task> & { modifiedBy?: string }): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: any = {
    'Tâche': { title: [{ text: { content: data.title || '' } }] },
    'Statut': { select: { name: data.status || 'Backlog' } },
  }
  if (data.priority) props['Priorité'] = { select: { name: data.priority } }
  if (data.module)   props['Module']   = { select: { name: data.module } }
  if (data.description) props['Description'] = { rich_text: [{ text: { content: data.description } }] }
  if (data.dateStart) props['Date de début'] = { date: { start: data.dateStart } }
  if (data.dateEnd)   props['Date de fin']   = { date: { start: data.dateEnd } }
  if (data.modifiedBy) props['Modifié par']  = { rich_text: [{ text: { content: data.modifiedBy } }] }
  await notion.pages.create({ parent: { database_id: DB.TASKS }, properties: props })
}

export async function updateTask(pageId: string, data: Partial<Task> & { modifiedBy?: string }): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: any = {}
  if (data.title !== undefined)       props['Tâche']         = { title: [{ text: { content: data.title } }] }
  if (data.status !== undefined)      props['Statut']        = { select: { name: data.status } }
  if (data.priority !== undefined)    props['Priorité']      = data.priority ? { select: { name: data.priority } } : { select: null }
  if (data.module !== undefined)      props['Module']        = data.module   ? { select: { name: data.module } }   : { select: null }
  if (data.description !== undefined) props['Description']   = { rich_text: data.description ? [{ text: { content: data.description } }] : [] }
  if (data.dateStart !== undefined)   props['Date de début'] = data.dateStart ? { date: { start: data.dateStart } } : { date: null }
  if (data.dateEnd !== undefined)     props['Date de fin']   = data.dateEnd   ? { date: { start: data.dateEnd } }   : { date: null }
  if (data.modifiedBy !== undefined)  props['Modifié par']   = { rich_text: [{ text: { content: data.modifiedBy } }] }
  await notion.pages.update({ page_id: pageId, properties: props })
}

export async function deleteTask(pageId: string): Promise<void> {
  await notion.pages.update({ page_id: pageId, archived: true })
}

// ── CRM ──────────────────────────────────────────────────────────────────────

export async function getCRM(): Promise<CRMEntry[]> {
  const res = await notion.databases.query({ database_id: DB.CRM, page_size: 100 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return res.results.map((p: any) => ({
    id: p.id,
    enseigne: t(p.properties['Enseigne']),
    contact: r(p.properties['Contact']),
    email: p.properties['Email']?.email ?? '',
    phone: p.properties['Téléphone']?.phone_number ?? '',
    ville: r(p.properties['Ville']),
    status: s(p.properties['Statut pipeline']) as CRMEntry['status'],
    canal: s(p.properties['Canal']),
    type: s(p.properties['Type']),
    priority: s(p.properties['Priorité']) as CRMEntry['priority'],
    notes: r(p.properties['Notes']),
    lastContact: d(p.properties['Dernier contact']),
    nextFollowup: d(p.properties['Prochain suivi']),
    modifiedBy: r(p.properties['Modifié par']),
    lastEdited: p.last_edited_time ?? '',
  }))
}

export async function createCRM(data: Partial<CRMEntry> & { modifiedBy?: string }): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: any = {
    'Enseigne': { title: [{ text: { content: data.enseigne || '' } }] },
    'Statut pipeline': { select: { name: data.status || 'À contacter' } },
  }
  if (data.contact)      props['Contact']          = { rich_text: [{ text: { content: data.contact } }] }
  if (data.email)        props['Email']             = { email: data.email }
  if (data.phone)        props['Téléphone']         = { phone_number: data.phone }
  if (data.ville)        props['Ville']             = { rich_text: [{ text: { content: data.ville } }] }
  if (data.canal)        props['Canal']             = { select: { name: data.canal } }
  if (data.type)         props['Type']              = { select: { name: data.type } }
  if (data.priority)     props['Priorité']          = { select: { name: data.priority } }
  if (data.notes)        props['Notes']             = { rich_text: [{ text: { content: data.notes } }] }
  if (data.nextFollowup) props['Prochain suivi']    = { date: { start: data.nextFollowup } }
  if (data.lastContact)  props['Dernier contact']   = { date: { start: data.lastContact } }
  if (data.modifiedBy)   props['Modifié par']       = { rich_text: [{ text: { content: data.modifiedBy } }] }
  await notion.pages.create({ parent: { database_id: DB.CRM }, properties: props })
}

export async function updateCRM(pageId: string, data: Partial<CRMEntry> & { modifiedBy?: string }): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: any = {}
  if (data.enseigne !== undefined)     props['Enseigne']         = { title: [{ text: { content: data.enseigne } }] }
  if (data.status !== undefined)       props['Statut pipeline']  = { select: { name: data.status } }
  if (data.contact !== undefined)      props['Contact']          = { rich_text: data.contact ? [{ text: { content: data.contact } }] : [] }
  if (data.email !== undefined)        props['Email']            = { email: data.email || null }
  if (data.phone !== undefined)        props['Téléphone']        = { phone_number: data.phone || null }
  if (data.ville !== undefined)        props['Ville']            = { rich_text: data.ville ? [{ text: { content: data.ville } }] : [] }
  if (data.canal !== undefined)        props['Canal']            = data.canal  ? { select: { name: data.canal } }  : { select: null }
  if (data.type !== undefined)         props['Type']             = data.type   ? { select: { name: data.type } }   : { select: null }
  if (data.priority !== undefined)     props['Priorité']         = data.priority ? { select: { name: data.priority } } : { select: null }
  if (data.notes !== undefined)        props['Notes']            = { rich_text: data.notes ? [{ text: { content: data.notes } }] : [] }
  if (data.nextFollowup !== undefined) props['Prochain suivi']   = data.nextFollowup ? { date: { start: data.nextFollowup } } : { date: null }
  if (data.lastContact !== undefined)  props['Dernier contact']  = data.lastContact  ? { date: { start: data.lastContact } }  : { date: null }
  if (data.modifiedBy !== undefined)   props['Modifié par']      = { rich_text: [{ text: { content: data.modifiedBy } }] }
  await notion.pages.update({ page_id: pageId, properties: props })
}

export async function deleteCRM(pageId: string): Promise<void> {
  await notion.pages.update({ page_id: pageId, archived: true })
}

// ── IDEAS ─────────────────────────────────────────────────────────────────────

export async function getIdeas(): Promise<Idea[]> {
  const res = await notion.databases.query({
    database_id: DB.IDEAS,
    sorts: [{ property: 'Votes', direction: 'descending' }],
    page_size: 100,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return res.results.map((p: any) => ({
    id: p.id,
    title: t(p.properties['Idée']),
    description: r(p.properties['Description']),
    status: s(p.properties['Statut']) as Idea['status'],
    category: s(p.properties['Catégorie']),
    effort: s(p.properties['Effort']) as Idea['effort'],
    votes: n(p.properties['Votes']),
    modifiedBy: r(p.properties['Modifié par']),
    lastEdited: p.last_edited_time ?? '',
  }))
}

export async function createIdea(data: Partial<Idea> & { modifiedBy?: string }): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: any = {
    'Idée': { title: [{ text: { content: data.title || '' } }] },
    'Statut': { select: { name: data.status || 'Brute' } },
    'Votes': { number: data.votes ?? 0 },
  }
  if (data.description) props['Description'] = { rich_text: [{ text: { content: data.description } }] }
  if (data.category)    props['Catégorie']   = { select: { name: data.category } }
  if (data.effort)      props['Effort']      = { select: { name: data.effort } }
  if (data.modifiedBy)  props['Modifié par'] = { rich_text: [{ text: { content: data.modifiedBy } }] }
  await notion.pages.create({ parent: { database_id: DB.IDEAS }, properties: props })
}

export async function updateIdea(pageId: string, data: Partial<Idea> & { modifiedBy?: string }): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: any = {}
  if (data.title !== undefined)       props['Idée']          = { title: [{ text: { content: data.title } }] }
  if (data.status !== undefined)      props['Statut']        = { select: { name: data.status } }
  if (data.description !== undefined) props['Description']   = { rich_text: data.description ? [{ text: { content: data.description } }] : [] }
  if (data.category !== undefined)    props['Catégorie']     = data.category ? { select: { name: data.category } } : { select: null }
  if (data.effort !== undefined)      props['Effort']        = data.effort   ? { select: { name: data.effort } }   : { select: null }
  if (data.votes !== undefined)       props['Votes']         = { number: data.votes }
  if (data.modifiedBy !== undefined)  props['Modifié par']   = { rich_text: [{ text: { content: data.modifiedBy } }] }
  await notion.pages.update({ page_id: pageId, properties: props })
}

export async function deleteIdea(pageId: string): Promise<void> {
  await notion.pages.update({ page_id: pageId, archived: true })
}

// ── EVENTS ───────────────────────────────────────────────────────────────────

export async function getEvents(): Promise<CalendarEvent[]> {
  const res = await notion.databases.query({ database_id: DB.EVENTS, page_size: 200 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return res.results.map((p: any) => ({
    id: p.id,
    title: t(p.properties['Titre']),
    dateStart: d(p.properties['Date début']),
    dateEnd: d(p.properties['Date fin']),
    type: (s(p.properties['Type']) || 'Autre') as CalendarEvent['type'],
    description: r(p.properties['Description']),
    modifiedBy: r(p.properties['Modifié par']),
    source: 'notion' as const,
  }))
}

export async function createEvent(data: Partial<CalendarEvent> & { modifiedBy?: string }): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: any = {
    'Titre': { title: [{ text: { content: data.title || '' } }] },
    'Type': { select: { name: data.type || 'Autre' } },
  }
  if (data.dateStart)    props['Date début']  = { date: { start: data.dateStart } }
  if (data.dateEnd)      props['Date fin']    = { date: { start: data.dateEnd } }
  if (data.description)  props['Description'] = { rich_text: [{ text: { content: data.description } }] }
  if (data.modifiedBy)   props['Modifié par'] = { rich_text: [{ text: { content: data.modifiedBy } }] }
  await notion.pages.create({ parent: { database_id: DB.EVENTS }, properties: props })
}

export async function updateEvent(pageId: string, data: Partial<CalendarEvent> & { modifiedBy?: string }): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: any = {}
  if (data.title !== undefined)       props['Titre']       = { title: [{ text: { content: data.title } }] }
  if (data.type !== undefined)        props['Type']        = { select: { name: data.type } }
  if (data.dateStart !== undefined)   props['Date début']  = data.dateStart ? { date: { start: data.dateStart } } : { date: null }
  if (data.dateEnd !== undefined)     props['Date fin']    = data.dateEnd   ? { date: { start: data.dateEnd } }   : { date: null }
  if (data.description !== undefined) props['Description'] = { rich_text: data.description ? [{ text: { content: data.description } }] : [] }
  if (data.modifiedBy !== undefined)  props['Modifié par'] = { rich_text: [{ text: { content: data.modifiedBy } }] }
  await notion.pages.update({ page_id: pageId, properties: props })
}

export async function deleteEvent(pageId: string): Promise<void> {
  await notion.pages.update({ page_id: pageId, archived: true })
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
  const res = await notion.databases.query({
    database_id: DB.NOTIFS,
    sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    page_size: 30,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return res.results.map((p: any) => ({
    id: p.id,
    message: t(p.properties['Message']),
    type: (s(p.properties['Type']) || 'info') as Notification['type'],
    lu: p.properties['Lu']?.checkbox ?? false,
    de: r(p.properties['De']),
    pour: s(p.properties['Pour']) || 'Tous',
    createdAt: p.created_time ?? '',
  }))
}

export async function createNotification(data: { message: string; type: Notification['type']; de: string; pour?: string }): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: any = {
    'Message': { title: [{ text: { content: data.message } }] },
    'Type': { select: { name: data.type } },
    'Lu': { checkbox: false },
    'De': { rich_text: [{ text: { content: data.de } }] },
    'Pour': { select: { name: data.pour || 'Tous' } },
  }
  await notion.pages.create({ parent: { database_id: DB.NOTIFS }, properties: props })
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  await Promise.all(ids.map(id => notion.pages.update({ page_id: id, properties: { 'Lu': { checkbox: true } } })))
}

// ── PRESENCE ─────────────────────────────────────────────────────────────────

export interface PresenceEntry {
  id: string
  username: string
  lastSeen: string
  online: boolean
}

export async function getPresence(): Promise<PresenceEntry[]> {
  const res = await notion.databases.query({ database_id: DB.PRESENCE, page_size: 10 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return res.results.map((p: any) => {
    const lastSeen = r(p.properties['Dernière vue'])
    const online = lastSeen ? Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000 : false
    return { id: p.id, username: t(p.properties['Utilisateur']), lastSeen, online }
  })
}

export async function upsertPresence(username: string): Promise<void> {
  const res = await notion.databases.query({ database_id: DB.PRESENCE, page_size: 10 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = res.results.find((p: any) => t(p.properties['Utilisateur']) === username)
  const now = new Date().toISOString()
  if (existing) {
    await notion.pages.update({ page_id: existing.id, properties: { 'Dernière vue': { rich_text: [{ text: { content: now } }] }, 'En ligne': { checkbox: true } } })
  } else {
    await notion.pages.create({ parent: { database_id: DB.PRESENCE }, properties: {
      'Utilisateur': { title: [{ text: { content: username } }] },
      'Dernière vue': { rich_text: [{ text: { content: now } }] },
      'En ligne': { checkbox: true },
    }})
  }
}

// legacy aliases used by existing routes
export const updateTaskStatus = (id: string, status: string) => updateTask(id, { status: status as Task['status'] })
export const updateCRMStatus  = (id: string, status: string) => updateCRM(id, { status: status as CRMEntry['status'] })
export const updateIdeaVotes  = (id: string, votes: number)  => updateIdea(id, { votes })
