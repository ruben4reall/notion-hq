import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getUserSettings, updateUserSettings } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await getUserSettings(user.name).catch(() => null)

  return NextResponse.json({
    name: user.name,
    email: user.email,
    displayName: settings?.displayName ?? null,
    icalFeedUrl: settings?.icalFeedUrl ?? null,
    avatarUrl: settings?.avatarUrl ?? null,
  })
}

export async function PATCH(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (body.type === 'displayName') {
    const value = String(body.value ?? '').trim().slice(0, 100)
    await updateUserSettings(user.name, { displayName: value || null })
    return NextResponse.json({ ok: true })
  }

  if (body.type === 'password') {
    const { newPassword } = body
    if (!newPassword || String(newPassword).length < 8) {
      return NextResponse.json({ error: 'Minimum 8 caractères requis' }, { status: 400 })
    }
    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({ password: String(newPassword) })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (body.type === 'ical') {
    await updateUserSettings(user.name, { icalFeedUrl: body.url || null })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
}
