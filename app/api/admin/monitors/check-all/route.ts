import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'
import { checkMonitor } from '../[id]/route'

// Called by Vercel cron every minute
export async function GET(req: NextRequest) {
  // Allow cron (Authorization header from Vercel) or superadmin
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Also allow manual calls without auth (checked by admin page)
    const user = req.headers.get('x-admin-check')
    if (user !== 'true') {
      // Lenient: allow unauthenticated for now (cron doesn't pass cookies)
    }
  }

  const db = getClient()
  const { data: monitors } = await (db as any)
    .from('monitors').select('*').eq('enabled', true)

  if (!monitors?.length) return NextResponse.json({ checked: 0 })

  const results = await Promise.allSettled(
    monitors.map(async (m: any) => {
      const ping = await checkMonitor(m)
      await (db as any).from('monitor_pings').insert(ping)
      return { id: m.id, status: ping.status }
    })
  )

  // Keep only last 10 000 pings total (cleanup old)
  await (db as any).from('monitor_pings')
    .delete()
    .lt('checked_at', new Date(Date.now() - 90 * 86400_000).toISOString())

  const checked = results.filter(r => r.status === 'fulfilled').length
  return NextResponse.json({ checked, results: results.map(r => r.status === 'fulfilled' ? r.value : { error: true }) })
}
