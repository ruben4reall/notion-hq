import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient, updateUserSettings } from '@/lib/db'

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const gifUrl = form.get('gifUrl') as string | null

  // GIF URL: just save it directly
  if (gifUrl) {
    await updateUserSettings(user.name, { avatarUrl: gifUrl })
    return NextResponse.json({ url: gifUrl })
  }

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const MAX = 5 * 1024 * 1024
  if (file.size > MAX) return NextResponse.json({ error: 'Fichier trop lourd (max 5 Mo)' }, { status: 400 })

  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowed.includes(file.type)) return NextResponse.json({ error: 'Format invalide' }, { status: 400 })

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const path = `${user.name.replace(/\s+/g, '_')}/${Date.now()}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const db = getClient()
  const { error: uploadError } = await db.storage
    .from('avatars')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = db.storage.from('avatars').getPublicUrl(path)

  await updateUserSettings(user.name, { avatarUrl: publicUrl })

  return NextResponse.json({ url: publicUrl })
}

export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await updateUserSettings(user.name, { avatarUrl: null })
  return NextResponse.json({ ok: true })
}
