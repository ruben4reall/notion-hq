import { NextResponse } from 'next/server'
import { getTasks, createTask } from '@/lib/notion'

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
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
