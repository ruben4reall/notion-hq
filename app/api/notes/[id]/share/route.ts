import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { shareNote } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { sharedWith } = await req.json()

  if (!Array.isArray(sharedWith)) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  try {
    await shareNote(id, token.name as string, sharedWith)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
