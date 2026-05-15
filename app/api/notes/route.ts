import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getNotes, createNote } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json([], { status: 401 })
  try {
    return NextResponse.json(await getNotes(user.name))
  } catch (err) {
    console.error(err)
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { titre, contenu } = await req.json()
    const note = await createNote(user.name, titre || 'Sans titre', contenu || '')
    return NextResponse.json(note)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
