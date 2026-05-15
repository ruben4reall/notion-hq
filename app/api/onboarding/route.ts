import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ done: false })

  const { data } = await getClient()
    .from('presence')
    .select('onboarding_done')
    .eq('username', user.name)
    .maybeSingle()

  return NextResponse.json({ done: !!data?.onboarding_done })
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await getClient()
    .from('presence')
    .upsert({ username: user.name, last_seen: new Date().toISOString(), onboarding_done: true }, { onConflict: 'username' })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await getClient()
    .from('presence')
    .update({ onboarding_done: false })
    .eq('username', user.name)

  return NextResponse.json({ ok: true })
}
