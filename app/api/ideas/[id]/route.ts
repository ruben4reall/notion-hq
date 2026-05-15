import { NextResponse } from 'next/server'
import { updateIdeaVotes } from '@/lib/notion'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { votes } = await request.json()
    await updateIdeaVotes(params.id, votes)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update idea' }, { status: 500 })
  }
}
