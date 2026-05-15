import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getNote, updateNote, deleteNote } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json(null, { status: 401 })
  try {
    const note = await getNote(id)
    if (!note || note.utilisateur !== user.name) return NextResponse.json(null, { status: 404 })
    return NextResponse.json(note)
  } catch (err) {
    console.error(err)
    return NextResponse.json(null, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const note = await getNote(id)
    if (!note || note.utilisateur !== user.name) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await updateNote(id, { titre: body.titre, contenu: body.contenu })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const note = await getNote(id)
    if (!note || note.utilisateur !== user.name) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await deleteNote(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
