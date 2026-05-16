import { NextRequest, NextResponse } from 'next/server'
import { getUser, getOrgId } from '@/lib/auth'
import { getChatMessages, sendChatMessage, createNotification } from '@/lib/db'

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
    const { message, destinataire } = await req.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    await sendChatMessage(orgId, user.name, message, destinataire || '')
    if (!destinataire) {
      createNotification({ message: `💬 ${user.name} : ${String(message).startsWith('gif::') ? '(GIF)' : String(message).slice(0, 60)}${String(message).length > 60 ? '…' : ''}`, type: 'info', de: user.name }).catch(() => {})
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
