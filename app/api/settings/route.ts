import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getUserSettings, updateUserSettings } from '@/lib/db'

const USERS = [
  { name: process.env.USER1_NAME!, username: process.env.USER1_USERNAME!, password: process.env.USER1_PASSWORD! },
  { name: process.env.USER2_NAME!, username: process.env.USER2_USERNAME!, password: process.env.USER2_PASSWORD! },
]

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const name = token.name as string
  const envUser = USERS.find(u => u.name === name)
  const settings = await getUserSettings(name).catch(() => null)

  return NextResponse.json({
    name,
    username: envUser?.username ?? (token.username as string) ?? '',
    displayName: settings?.displayName ?? null,
    hasPasswordOverride: !!settings?.passwordOverride,
  })
}

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const name = token.name as string
  const body = await req.json()

  if (body.type === 'displayName') {
    const value = String(body.value ?? '').trim().slice(0, 100)
    await updateUserSettings(name, { displayName: value || null })
    return NextResponse.json({ ok: true })
  }

  if (body.type === 'password') {
    const { currentPassword, newPassword } = body
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }
    if (String(newPassword).length < 8) {
      return NextResponse.json({ error: 'Minimum 8 caractères requis' }, { status: 400 })
    }

    const envUser = USERS.find(u => u.name === name)
    if (!envUser) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    const settings = await getUserSettings(name).catch(() => null)
    const expected = settings?.passwordOverride || envUser.password

    if (currentPassword !== expected) {
      return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 })
    }

    await updateUserSettings(name, { passwordOverride: String(newPassword) })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
}
