import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient } from '@/lib/db'

async function isSuperAdmin(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return false
  const db = getClient()
  const { data } = await db.from('presence').select('username').eq('username', user.name).maybeSingle()
  // Super admin = first user (simplest check used elsewhere)
  const { data: all } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (!all?.users?.length) return false
  const sorted = [...all.users].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  return sorted[0]?.email === user.email
}

// GET — list all monitors with latest ping + uptime stats
export async function GET(req: NextRequest) {
  if (!await isSuperAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getClient()

  const { data: monitors } = await (db as any).from('monitors').select('*').order('created_at')
  if (!monitors?.length) return NextResponse.json([])

  const results = await Promise.all(monitors.map(async (m: any) => {
    // Latest ping
    const { data: latest } = await (db as any)
      .from('monitor_pings').select('*').eq('monitor_id', m.id)
      .order('checked_at', { ascending: false }).limit(1).maybeSingle()

    // Last 90 pings for bar chart
    const { data: history } = await (db as any)
      .from('monitor_pings').select('status, response_ms, checked_at')
      .eq('monitor_id', m.id).order('checked_at', { ascending: false }).limit(90)

    // 7d uptime
    const since7d = new Date(Date.now() - 7 * 86400_000).toISOString()
    const { data: pings7d } = await (db as any)
      .from('monitor_pings').select('status').eq('monitor_id', m.id).gte('checked_at', since7d)
    const up7d = (pings7d || []).filter((p: any) => p.status === 'up').length
    const total7d = (pings7d || []).length
    const uptime7d = total7d > 0 ? Math.round((up7d / total7d) * 1000) / 10 : null

    // 24h uptime
    const since24h = new Date(Date.now() - 86400_000).toISOString()
    const { data: pings24h } = await (db as any)
      .from('monitor_pings').select('status').eq('monitor_id', m.id).gte('checked_at', since24h)
    const up24h = (pings24h || []).filter((p: any) => p.status === 'up').length
    const total24h = (pings24h || []).length
    const uptime24h = total24h > 0 ? Math.round((up24h / total24h) * 1000) / 10 : null

    // Avg response 24h
    const avgMs = pings24h?.length
      ? Math.round(pings24h.filter((p: any) => p.response_ms).reduce((s: number, p: any) => s + (p.response_ms || 0), 0) / pings24h.filter((p: any) => p.response_ms).length) || null
      : null

    return {
      ...m,
      latestPing: latest || null,
      history: (history || []).reverse(),
      uptime7d,
      uptime24h,
      avgMs24h: avgMs,
    }
  }))

  return NextResponse.json(results)
}

// POST — create monitor
export async function POST(req: NextRequest) {
  if (!await isSuperAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { name, url, type = 'http', keyword, interval_min = 5, notify_on_down = true } = body
  if (!name || !url) return NextResponse.json({ error: 'name and url required' }, { status: 400 })

  const db = getClient()
  const { data, error } = await (db as any).from('monitors').insert({ name, url, type, keyword, interval_min, notify_on_down }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
