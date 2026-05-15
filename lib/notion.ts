import { Client } from '@notionhq/client'
import type { Task, CRMEntry, Idea } from './types'

const notion = new Client({ auth: process.env.NOTION_TOKEN! })

const DB = {
  TASKS: process.env.NOTION_TASKS_DB!,
  CRM: process.env.NOTION_CRM_DB!,
  IDEAS: process.env.NOTION_IDEAS_DB!,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const title = (p: any) => p?.title?.[0]?.plain_text ?? ''
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const select = (p: any) => p?.select?.name ?? ''
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rich = (p: any) => p?.rich_text?.[0]?.plain_text ?? ''
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const date = (p: any) => p?.date?.start ?? ''
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const num = (p: any) => p?.number ?? 0

export async function getTasks(): Promise<Task[]> {
  const res = await notion.databases.query({ database_id: DB.TASKS, page_size: 100 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return res.results.map((p: any) => ({
    id: p.id,
    title: title(p.properties['Tâche']),
    status: select(p.properties['Statut']) as Task['status'],
    priority: select(p.properties['Priorité']) as Task['priority'],
    module: select(p.properties['Module']) as Task['module'],
    description: rich(p.properties['Description']),
    dateStart: date(p.properties['Date de début']),
    dateEnd: date(p.properties['Date de fin']),
  }))
}

export async function updateTaskStatus(pageId: string, status: string) {
  await notion.pages.update({
    page_id: pageId,
    properties: { Statut: { select: { name: status } } },
  })
}

export async function getCRM(): Promise<CRMEntry[]> {
  const res = await notion.databases.query({ database_id: DB.CRM, page_size: 100 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return res.results.map((p: any) => ({
    id: p.id,
    enseigne: title(p.properties['Enseigne']),
    contact: rich(p.properties['Contact']),
    email: p.properties['Email']?.email ?? '',
    phone: p.properties['Téléphone']?.phone_number ?? '',
    ville: rich(p.properties['Ville']),
    status: select(p.properties['Statut pipeline']) as CRMEntry['status'],
    canal: select(p.properties['Canal']),
    type: select(p.properties['Type']),
    priority: select(p.properties['Priorité']) as CRMEntry['priority'],
    notes: rich(p.properties['Notes']),
    lastContact: date(p.properties['Dernier contact']),
    nextFollowup: date(p.properties['Prochain suivi']),
  }))
}

export async function updateCRMStatus(pageId: string, status: string) {
  await notion.pages.update({
    page_id: pageId,
    properties: { 'Statut pipeline': { select: { name: status } } },
  })
}

export async function getIdeas(): Promise<Idea[]> {
  const res = await notion.databases.query({
    database_id: DB.IDEAS,
    sorts: [{ property: 'Votes', direction: 'descending' }],
    page_size: 100,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return res.results.map((p: any) => ({
    id: p.id,
    title: title(p.properties['Idée']),
    description: rich(p.properties['Description']),
    status: select(p.properties['Statut']) as Idea['status'],
    category: select(p.properties['Catégorie']),
    effort: select(p.properties['Effort']) as Idea['effort'],
    votes: num(p.properties['Votes']),
  }))
}

export async function updateIdeaVotes(pageId: string, votes: number) {
  await notion.pages.update({
    page_id: pageId,
    properties: { Votes: { number: votes } },
  })
}
