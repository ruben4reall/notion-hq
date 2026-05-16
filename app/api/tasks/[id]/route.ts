import { NextRequest, NextResponse } from 'next/server'
import { getUser, getOrgId } from '@/lib/auth'
import { getTasks, updateTask, deleteTask, createNotification } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = getOrgId(req)
  if (!orgId) return NextResponse.json({ error: 'No project' }, { status: 400 })
  try {
    const { id } = await params
    const body = await req.json()
    if (body.assignedTo !== undefined && body.assignedTo !== body.modifiedBy) {
      const all = await getTasks(orgId)
      const existing = all.find(t => t.id === id)
      if (existing && existing.assignedTo !== body.assignedTo && body.assignedTo) {
        createNotification({ message: `📌 Tu as été assigné(e) à : "${body.title || existing.title}"`, type: 'info', de: body.modifiedBy || '', pour: body.assignedTo }).catch(() => {})
      }
    }
    await updateTask(id, body)
    if (body.status === 'Done' && body.title) {
      createNotification({ message: `✅ Tâche terminée : "${body.title}"`, type: 'success', de: body.modifiedBy || '' }).catch(() => {})
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteTask(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
