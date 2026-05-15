import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getChatMessages, sendChatMessage, createNotification } from '@/lib/db'

export async function GET() {
  if (!process.env.NOTION_CHAT_DB) return NextResponse.json([])
  try {
    return NextResponse.json(await getChatMessages(100))
  } catch (err) {
    console.error(err)
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.NOTION_CHAT_DB) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const author = (token?.name as string) || 'Anonyme'

  try {
    const { message, destinataire } = await req.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Message vide' }, { status: 400 })

    await sendChatMessage(author, message, destinataire || '')

    // Notify only for group messages, not DMs
    if (!destinataire) {
      createNotification({
        message: `💬 ${author} : ${String(message).startsWith('gif::') ? '(GIF)' : String(message).slice(0, 60)}${String(message).length > 60 ? '…' : ''}`,
        type: 'info',
        de: author,
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
