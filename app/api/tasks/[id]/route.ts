import { NextResponse } from 'next/server'
import { updateTaskStatus } from '@/lib/notion'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json()
    await updateTaskStatus(params.id, status)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}
