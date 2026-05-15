import { NextResponse } from 'next/server'
import { getIdeas, createIdea, createNotification } from '@/lib/db'

export async function GET() {
  try {
    return NextResponse.json(await getIdeas())
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    await createIdea(body)
    createNotification({ message: `💡 Nouvelle idée : "${body.title}"`, type: 'info', de: body.modifiedBy || '' }).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create idea' }, { status: 500 })
  }
}
