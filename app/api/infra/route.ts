import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'
import { getUser } from '@/lib/auth'

const SB_REF = process.env.SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] ?? ''

const SB_LIMITS = {
  db_size:    500  * 1024 * 1024,
  storage:    1024 * 1024 * 1024,
  auth_users: 50_000,
}
const VERCEL_LIMITS = { bandwidth: 100 * 1024 * 1024 * 1024, build_minutes: 6_000 }

const APP_TABLES = [
  'tasks','crm','ideas','events','notes',
  'time_sessions','notifications','presence',
  'chat_messages','organizations','org_members',
]

async function sbQuery(token: string, sql: string) {
  const r = await fetch(
    `https://api.supabase.com/v1/projects/${SB_REF}/database/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
      cache: 'no-store',
    }
  )
  if (!r.ok) return null
  return r.json()
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getClient()

  // ── 1. Ping ─────────────────────────────────────────────────
  const t0 = Date.now()
  await db.from('presence').select('id').limit(1)
  const ping = Date.now() - t0

  // ── 2. Table row counts ─────────────────────────────────────
  const tableCounts: Record<string, number> = {}
  await Promise.all(
    APP_TABLES.map(async t => {
      const { count } = await db.from(t).select('*', { count: 'exact', head: true })
      tableCounts[t] = count ?? 0
    })
  )
  const totalRows = Object.values(tableCounts).reduce((a, b) => a + b, 0)

  // ── 3. Users online (presence table) ───────────────────────
  const twoMinAgo = new Date(Date.now() - 2 * 60_000).toISOString()
  const { data: onlineUsers } = await db
    .from('presence')
    .select('display_name, username, last_seen, connected_at')
    .gte('last_seen', twoMinAgo)
    .order('last_seen', { ascending: false })

  // ── 4. Row history sparkline ────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  let rowHistory: { date: string; value: number }[] = []
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mt = db.from('_infra_metrics' as any) as any
    await mt.upsert({ metric: 'total_rows', value: totalRows, captured_at: today }, { onConflict: 'metric,captured_at' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db.from('_infra_metrics' as any) as any)
      .select('captured_at, value').eq('metric', 'total_rows')
      .order('captured_at', { ascending: true }).limit(14)
    rowHistory = ((data as { captured_at: string; value: number }[]) ?? []).map(r => ({ date: r.captured_at, value: Number(r.value) }))
  } catch { /* not migrated yet */ }

  // ── 5. Page analytics ───────────────────────────────────────
  interface PageStat { page: string; visits: number; avg_sec: number; total_sec: number }
  interface HourStat { hour: number; visits: number }
  interface UserStat { username: string; visits: number; total_sec: number }

  let pageStats: PageStat[] = []
  let hourlyActivity: HourStat[] = []
  let topUsers: UserStat[] = []
  let totalVisits = 0
  let avgSessionSec = 0

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pa = (sql: string) => (db.from('_page_analytics' as any) as any).select(sql)
    void pa // type guard

    const [pagesRes, hourlyRes, usersRes, globalRes] = await Promise.all([
      // Top pages by visits (last 30 days)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.from('_page_analytics' as any) as any)
        .select('page, duration_sec')
        .gte('visited_at', new Date(Date.now() - 30 * 86400000).toISOString()),

      // Hourly activity pattern (last 7 days)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.from('_page_analytics' as any) as any)
        .select('visited_at')
        .gte('visited_at', new Date(Date.now() - 7 * 86400000).toISOString()),

      // Top users by activity
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.from('_page_analytics' as any) as any)
        .select('username, duration_sec')
        .gte('visited_at', new Date(Date.now() - 30 * 86400000).toISOString())
        .not('username', 'is', null),

      // Global stats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.from('_page_analytics' as any) as any)
        .select('duration_sec')
        .gte('visited_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    ])

    // Aggregate pages
    const pageMap: Record<string, { visits: number; total: number }> = {}
    for (const row of (pagesRes.data ?? []) as { page: string; duration_sec: number }[]) {
      if (!pageMap[row.page]) pageMap[row.page] = { visits: 0, total: 0 }
      pageMap[row.page].visits++
      pageMap[row.page].total += row.duration_sec
    }
    pageStats = Object.entries(pageMap)
      .map(([page, s]) => ({ page, visits: s.visits, avg_sec: Math.round(s.total / s.visits), total_sec: s.total }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10)

    // Hourly buckets
    const hourMap: Record<number, number> = {}
    for (let h = 0; h < 24; h++) hourMap[h] = 0
    for (const row of (hourlyRes.data ?? []) as { visited_at: string }[]) {
      const h = new Date(row.visited_at).getHours()
      hourMap[h] = (hourMap[h] || 0) + 1
    }
    hourlyActivity = Object.entries(hourMap).map(([h, v]) => ({ hour: Number(h), visits: v }))

    // Top users
    const userMap: Record<string, { visits: number; total: number }> = {}
    for (const row of (usersRes.data ?? []) as { username: string; duration_sec: number }[]) {
      if (!row.username) continue
      if (!userMap[row.username]) userMap[row.username] = { visits: 0, total: 0 }
      userMap[row.username].visits++
      userMap[row.username].total += row.duration_sec
    }
    topUsers = Object.entries(userMap)
      .map(([username, s]) => ({ username, visits: s.visits, total_sec: s.total }))
      .sort((a, b) => b.total_sec - a.total_sec)
      .slice(0, 8)

    // Global
    const all = (globalRes.data ?? []) as { duration_sec: number }[]
    totalVisits = all.length
    avgSessionSec = all.length > 0 ? Math.round(all.reduce((s, r) => s + r.duration_sec, 0) / all.length) : 0
  } catch { /* not migrated yet */ }

  // ── 6. Supabase SQL metrics ─────────────────────────────────
  interface SbMetrics {
    db_bytes: number; auth_users: number; active_sessions: number
    pg_version: string; storage_bytes: number; storage_objects: number
    table_sizes: { tablename: string; bytes: number }[]
    db_history: number[]
  }
  let sbMetrics: SbMetrics | null = null

  const sbToken = process.env.SUPABASE_ACCESS_TOKEN
  if (sbToken && SB_REF) {
    try {
      const [core, storage, tables] = await Promise.all([
        sbQuery(sbToken, `
          SELECT pg_database_size(current_database()) AS db_bytes,
                 (SELECT count(*)::int FROM auth.users) AS auth_users,
                 (SELECT count(*)::int FROM auth.sessions WHERE not_after > now()) AS active_sessions,
                 split_part(version(), ' ', 2) AS pg_version
        `),
        sbQuery(sbToken, `
          SELECT COALESCE(sum((metadata->>'size')::bigint),0) AS storage_bytes,
                 count(*)::int AS storage_objects
          FROM storage.objects
        `),
        sbQuery(sbToken, `
          SELECT tablename, pg_total_relation_size(quote_ident(tablename))::int AS bytes
          FROM pg_tables WHERE schemaname='public' ORDER BY bytes DESC LIMIT 12
        `),
      ])

      // Store db_bytes snapshot + fetch history
      await sbQuery(sbToken, `
        INSERT INTO _infra_metrics (metric, value, captured_at)
        VALUES ('db_bytes', pg_database_size(current_database()), CURRENT_DATE)
        ON CONFLICT (metric, captured_at) DO UPDATE SET value = EXCLUDED.value
      `)
      const dbHistory = await sbQuery(sbToken, `
        SELECT value::numeric FROM _infra_metrics
        WHERE metric='db_bytes' ORDER BY captured_at ASC LIMIT 14
      `)

      sbMetrics = {
        db_bytes:        Number(core?.[0]?.db_bytes        ?? 0),
        auth_users:      Number(core?.[0]?.auth_users      ?? 0),
        active_sessions: Number(core?.[0]?.active_sessions ?? 0),
        pg_version:      String(core?.[0]?.pg_version      ?? ''),
        storage_bytes:   Number(storage?.[0]?.storage_bytes  ?? 0),
        storage_objects: Number(storage?.[0]?.storage_objects ?? 0),
        table_sizes:     (tables ?? []).map((r: { tablename: string; bytes: string }) => ({ tablename: r.tablename, bytes: Number(r.bytes) })),
        db_history:      (dbHistory ?? []).map((r: { value: string }) => Number(r.value)),
      }
    } catch { /* token invalid */ }
  }

  // ── 7. Vercel deployments ────────────────────────────────────
  let vercelDeployments: { uid: string; state: string; created: number; url: string; meta?: { githubCommitMessage?: string } }[] = []
  const vercelToken   = process.env.VERCEL_TOKEN
  const vercelProject = process.env.VERCEL_PROJECT_ID ?? ''
  if (vercelToken && vercelProject) {
    try {
      const r = await fetch(
        `https://api.vercel.com/v6/deployments?projectId=${vercelProject}&limit=20`,
        { headers: { Authorization: `Bearer ${vercelToken}` }, cache: 'no-store' }
      )
      if (r.ok) vercelDeployments = (await r.json()).deployments ?? []
    } catch {}
  }

  return NextResponse.json({
    ping, tableCounts, totalRows, rowHistory,
    onlineUsers: onlineUsers ?? [],
    pageStats, hourlyActivity, topUsers, totalVisits, avgSessionSec,
    sbMetrics, sbLimits: SB_LIMITS,
    vercelDeployments, vercelLimits: VERCEL_LIMITS,
    hasSupabaseToken: !!sbToken,
    hasVercelToken:   !!vercelToken,
  })
}
