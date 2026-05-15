import { NextResponse } from 'next/server'
import { getTasks } from '@/lib/notion'

export async function GET() {
  try {
    const tasks = await getTasks()
    return NextResponse.json(tasks)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}
