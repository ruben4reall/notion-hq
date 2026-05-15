import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getNotes, createNote } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json([], { status: 401 })
  const username = token.name as string
  try {
    return NextResponse.json(await getNotes(username))
  } catch (err) {
    console.error(err)
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const username = token.name as string
  try {
    const { titre, contenu } = await req.json()
    const note = await createNote(username, titre || 'Sans titre', contenu || '')
    return NextResponse.json(note)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
