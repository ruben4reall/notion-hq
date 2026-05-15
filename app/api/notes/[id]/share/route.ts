import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { shareNote } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { sharedWith } = await req.json()

  if (!Array.isArray(sharedWith)) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  try {
    await shareNote(id, user.name, sharedWith)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
