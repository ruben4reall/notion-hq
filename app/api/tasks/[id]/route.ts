import { NextResponse } from 'next/server'
import { updateTask, deleteTask, createNotification } from '@/lib/notion'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    await updateTask(params.id, body)
    if (body.status === 'Done' && body.title) {
      createNotification({ message: `✅ Tâche terminée : "${body.title}"`, type: 'success', de: body.modifiedBy || '' }).catch(() => {})
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await deleteTask(params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
