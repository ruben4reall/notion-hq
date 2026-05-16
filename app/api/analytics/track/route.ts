import { NextRequest, NextResponse } from 'next/server'
import { getUser, getOrgId } from '@/lib/auth'
import { getClient } from '@/lib/db'

export async function POST(req: NextRequest) {
  const user  = await getUser(req)
  const orgId = getOrgId(req)

  const { page, duration_sec } = await req.json()
  if (!page || typeof page !== 'string') return NextResponse.json({})

  const db = getClient()
  try {
    await (db.from('_page_analytics' as any) as any).insert({
      page: page.slice(0, 100),
      username: user?.name ?? null,
      org_id: orgId ?? null,
      duration_sec: Math.min(Number(duration_sec) || 0, 86400),
    })
  } catch { /* table may not be migrated yet */ }

  return NextResponse.json({ ok: true })
}
