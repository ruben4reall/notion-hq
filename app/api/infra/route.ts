import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'
import { getUser } from '@/lib/auth'

const SB_REF = process.env.SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] ?? ''

// Free tier hard limits
const SB_LIMITS = {
  db_size:              500  * 1024 * 1024,       // 500 MB
  storage:             1024 * 1024 * 1024,         // 1 GB
  monthly_active_users: 50_000,
  db_egress:           5    * 1024 * 1024 * 1024,  // 5 GB
}

const VERCEL_LIMITS = {
  bandwidth:     100  * 1024 * 1024 * 1024, // 100 GB
  build_minutes: 6_000,
}

const TABLES = [
  'tasks','crm','ideas','events','notes',
  'time_sessions','notifications','presence',
  'chat_messages','organizations','org_members',
]

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getClient()

  // ── 1. DB ping ──────────────────────────────────────────────
  const t0 = Date.now()
  await db.from('presence').select('id').limit(1)
  const ping = Date.now() - t0

  // ── 2. Table row counts ─────────────────────────────────────
  const tableCounts: Record<string, number> = {}
  await Promise.all(
    TABLES.map(async t => {
      const { count } = await db.from(t).select('*', { count: 'exact', head: true })
      tableCounts[t] = count ?? 0
    })
  )
  const totalRows = Object.values(tableCounts).reduce((a, b) => a + b, 0)

  // ── 3. Store + fetch daily snapshot history ─────────────────
  const today = new Date().toISOString().slice(0, 10)
  let rowHistory: { date: string; value: number }[] = []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metricsTable = db.from('_infra_metrics' as any) as any
    await metricsTable.upsert(
      { metric: 'total_rows', value: totalRows, captured_at: today },
      { onConflict: 'metric,captured_at' }
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db.from('_infra_metrics' as any) as any)
      .select('captured_at, value')
      .eq('metric', 'total_rows')
      .order('captured_at', { ascending: true })
      .limit(14)
    rowHistory = ((data as { captured_at: string; value: number }[]) ?? [])
      .map(r => ({ date: r.captured_at, value: Number(r.value) }))
  } catch {
    // _infra_metrics doesn't exist yet (migration pending) — skip silently
  }

  // ── 4. Supabase Management API ──────────────────────────────
  let sbUsage: Record<string, { used: number; limit: number }> | null = null
  let sbApiSpark: number[] = []

  const sbToken = process.env.SUPABASE_ACCESS_TOKEN
  if (sbToken && SB_REF) {
    try {
      // Current period usage
      const usageRes = await fetch(
        `https://api.supabase.com/v1/projects/${SB_REF}/usage`,
        { headers: { Authorization: `Bearer ${sbToken}` }, cache: 'no-store' }
      )
      if (usageRes.ok) {
        const { usages } = await usageRes.json() as { usages: { metric: string; usage: number; limit: number }[] }
        sbUsage = {}
        for (const u of usages ?? []) {
          const limit = SB_LIMITS[u.metric as keyof typeof SB_LIMITS] ?? u.limit ?? 0
          sbUsage[u.metric] = { used: u.usage ?? 0, limit }
        }
      }

      // Last 7 days of API requests (sparkline)
      const end   = new Date().toISOString()
      const start = new Date(Date.now() - 7 * 86_400_000).toISOString()
      const sparkRes = await fetch(
        `https://api.supabase.com/v1/projects/${SB_REF}/daily-stats?attribute=api_requests&startTime=${start}&endTime=${end}`,
        { headers: { Authorization: `Bearer ${sbToken}` }, cache: 'no-store' }
      )
      if (sparkRes.ok) {
        const { data } = await sparkRes.json() as { data: { timestamp: string; value: number }[] }
        sbApiSpark = (data ?? []).map(d => d.value)
      }
    } catch {}
  }

  // ── 5. Vercel API ───────────────────────────────────────────
  let vercelDeployments: {
    uid: string
    name: string
    state: string
    created: number
    url: string
    meta?: { githubCommitMessage?: string }
  }[] = []

  const vercelToken   = process.env.VERCEL_TOKEN
  const vercelProject = process.env.VERCEL_PROJECT_ID ?? 'manager-thenextbigthing'

  if (vercelToken) {
    try {
      const r = await fetch(
        `https://api.vercel.com/v6/deployments?app=${vercelProject}&limit=20`,
        { headers: { Authorization: `Bearer ${vercelToken}` }, cache: 'no-store' }
      )
      if (r.ok) {
        const d = await r.json()
        vercelDeployments = d.deployments ?? []
      }
    } catch {}
  }

  return NextResponse.json({
    ping,
    tableCounts,
    totalRows,
    rowHistory,
    sbUsage,
    sbApiSpark,
    sbLimits: SB_LIMITS,
    vercelDeployments,
    vercelLimits: VERCEL_LIMITS,
    hasSupabaseToken: !!sbToken,
    hasVercelToken:   !!vercelToken,
  })
}
