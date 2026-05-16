import { NextRequest, NextResponse } from 'next/server'
import { getUser, getOrgId } from '@/lib/auth'
import { getTasks, createTask, createNotification } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json([], { status: 401 })
  const orgId = getOrgId(req)
  if (!orgId) return NextResponse.json([], { status: 400 })
  try {
    return NextResponse.json(await getTasks(orgId))
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = getOrgId(req)
  if (!orgId) return NextResponse.json({ error: 'No project' }, { status: 400 })
  try {
    const body = await req.json()
    await createTask(orgId, body)
    createNotification({ message: `Nouvelle tâche : "${body.title}"`, type: 'info', de: body.modifiedBy || '' }).catch(() => {})
    if (body.assignedTo && body.assignedTo !== body.modifiedBy) {
      createNotification({ message: `📌 Tu as été assigné(e) à : "${body.title}"`, type: 'info', de: body.modifiedBy || '', pour: body.assignedTo }).catch(() => {})
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
