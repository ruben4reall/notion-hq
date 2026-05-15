import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getClient } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.name) return NextResponse.json({ done: false })

  const { data } = await getClient()
    .from('presence')
    .select('onboarding_done')
    .eq('username', session.user.name)
    .maybeSingle()

  return NextResponse.json({ done: !!data?.onboarding_done })
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.name) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await getClient()
    .from('presence')
    .upsert({ username: session.user.name, last_seen: new Date().toISOString(), onboarding_done: true }, { onConflict: 'username' })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.name) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await getClient()
    .from('presence')
    .update({ onboarding_done: false })
    .eq('username', session.user.name)

  return NextResponse.json({ ok: true })
}
