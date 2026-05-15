import { NextResponse } from 'next/server'
import { getTasks, updateTask, deleteTask, createNotification } from '@/lib/db'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // Detect assignee change before updating
    if (body.assignedTo !== undefined && body.assignedTo !== body.modifiedBy) {
      const all = await getTasks()
      const existing = all.find(t => t.id === id)
      if (existing && existing.assignedTo !== body.assignedTo && body.assignedTo) {
        createNotification({
          message: `📌 Tu as été assigné(e) à : "${body.title || existing.title}"`,
          type: 'info',
          de: body.modifiedBy || '',
          pour: body.assignedTo,
        }).catch(() => {})
      }
    }

    await updateTask(id, body)

    if (body.status === 'Done' && body.title) {
      createNotification({ message: `✅ Tâche terminée : "${body.title}"`, type: 'success', de: body.modifiedBy || '' }).catch(() => {})
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteTask(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
