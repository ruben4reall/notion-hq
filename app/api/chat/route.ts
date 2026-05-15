import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getChatMessages, sendChatMessage, createNotification } from '@/lib/notion'

export async function GET(req: NextRequest) {
  if (!process.env.NOTION_CHAT_DB) return NextResponse.json([])
  try {
    const messages = await getChatMessages(50)
    return NextResponse.json(messages)
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
    const { message } = await req.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Message vide' }, { status: 400 })

    await sendChatMessage(author, message)

    createNotification({
      message: `💬 ${author} : ${String(message).slice(0, 60)}${message.length > 60 ? '…' : ''}`,
      type: 'info',
      de: author,
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
