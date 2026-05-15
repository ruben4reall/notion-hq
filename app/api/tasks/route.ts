import { NextResponse } from 'next/server'
import { getTasks, createTask, createNotification } from '@/lib/db'

export async function GET() {
  try {
    return NextResponse.json(await getTasks())
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    await createTask(body)
    createNotification({ message: `Nouvelle tâche : "${body.title}"`, type: 'info', de: body.modifiedBy || '' }).catch(() => {})
    if (body.assignedTo && body.assignedTo !== body.modifiedBy) {
      createNotification({
        message: `📌 Tu as été assigné(e) à : "${body.title}"`,
        type: 'info',
        de: body.modifiedBy || '',
        pour: body.assignedTo,
      }).catch(() => {})
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
