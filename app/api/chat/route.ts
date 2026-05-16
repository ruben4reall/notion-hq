import { NextRequest, NextResponse } from 'next/server'
import { getUser, getOrgId } from '@/lib/auth'
import { getChatMessages, sendChatMessage, createNotification } from '@/lib/db'

const MAX_MESSAGE_LENGTH = 2000

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json([], { status: 401 })
  const orgId = getOrgId(req)
  if (!orgId) return NextResponse.json([], { status: 400 })
  try {
    return NextResponse.json(await getChatMessages(orgId, 100))
  } catch (err) {
    console.error(err)
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = getOrgId(req)
  if (!orgId) return NextResponse.json({ error: 'No project' }, { status: 400 })
  try {
    const body = await req.json()
    const message = String(body?.message || '').trim()
    const destinataire = String(body?.destinataire || '').trim().slice(0, 200)
    if (!message) return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    if (message.length > MAX_MESSAGE_LENGTH) return NextResponse.json({ error: 'Message trop long' }, { status: 400 })
    await sendChatMessage(orgId, user.name, message, destinataire)
    if (!destinataire) {
      const preview = message.startsWith('gif::') ? '(GIF)' : message.slice(0, 60) + (message.length > 60 ? '…' : '')
      createNotification({ message: `💬 ${user.name} : ${preview}`, type: 'info', de: user.name }).catch(() => {})
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
