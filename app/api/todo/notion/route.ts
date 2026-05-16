import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = req.headers.get('x-notion-token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const { database_id } = await req.json()
  if (!database_id) return NextResponse.json({ error: 'Missing database_id' }, { status: 400 })

  const res = await fetch(`https://api.notion.com/v1/databases/${database_id}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ page_size: 100, filter: { property: 'title', title: { is_not_empty: true } } }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err.message || 'Erreur Notion' }, { status: res.status })
  }

  const data = await res.json()

  const tasks = (data.results || []).map((page: Record<string, unknown>) => {
    const props = (page.properties || {}) as Record<string, Record<string, unknown>>

    // Title — try "Name", "Titre", "Task", "Todo", or first title property
    let title = ''
    const titleProp = Object.values(props).find((p) => p.type === 'title') as Record<string, unknown> | undefined
    if (titleProp) {
      title = ((titleProp.title as Array<{ plain_text: string }>) || []).map(t => t.plain_text).join('')
    }
    if (!title) return null

    // Status — try checkbox (done/not done) or status property
    let done = false
    const checkboxProp = Object.values(props).find((p) => p.type === 'checkbox') as Record<string, unknown> | undefined
    if (checkboxProp) done = checkboxProp.checkbox as boolean

    const statusProp = Object.values(props).find((p) => p.type === 'status') as Record<string, unknown> | undefined
    if (statusProp) {
      const name = ((statusProp.status as Record<string, string>) || {}).name?.toLowerCase() || ''
      if (name === 'done' || name === 'terminé' || name === 'terminée' || name === 'completed') done = true
    }

    // Due date — try "Date", "Due", "Deadline", "Échéance"
    let due: string | null = null
    const dateProp = Object.values(props).find((p) => p.type === 'date') as Record<string, unknown> | undefined
    if (dateProp) due = ((dateProp.date as Record<string, string>) || {}).start || null

    // Priority — try select property
    let priority: string | null = null
    const selectProp = Object.values(props).find((p) => p.type === 'select') as Record<string, unknown> | undefined
    if (selectProp) {
      const name = ((selectProp.select as Record<string, string>) || {}).name || ''
      if (/urgent|critique|p0/i.test(name)) priority = 'P0'
      else if (/high|haute|p1/i.test(name)) priority = 'P1'
      else if (/medium|normale|p2/i.test(name)) priority = 'P2'
    }

    return { id: page.id as string, title, done, due, priority }
  }).filter(Boolean)

  return NextResponse.json({ tasks })
}
