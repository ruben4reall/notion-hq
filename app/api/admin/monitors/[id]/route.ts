import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient } from '@/lib/db'
import { checkMonitor } from '@/lib/checkMonitor'

async function isSuperAdmin(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return false
  const db = getClient()
  const { data: all } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (!all?.users?.length) return false
  const sorted = [...all.users].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  return sorted[0]?.email === user.email
}

// PATCH — update monitor (toggle enabled, rename, etc.)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isSuperAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const db = getClient()
  const { data, error } = await (db as any).from('monitors').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — remove monitor and all its pings
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isSuperAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getClient()
  const { error } = await (db as any).from('monitors').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// POST — check this monitor now
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isSuperAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getClient()
  const { data: monitor } = await (db as any).from('monitors').select('*').eq('id', id).maybeSingle()
  if (!monitor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const result = await checkMonitor(monitor)
  const { data: ping, error } = await (db as any).from('monitor_pings').insert(result).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(ping)
}

