import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = req.headers.get('x-todoist-token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return NextResponse.json({ error: 'Invalid Todoist token' }, { status: 401 })

  const tasks = await res.json()
  return NextResponse.json({ tasks })
}
