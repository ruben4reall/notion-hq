import { NextResponse } from 'next/server'
import { getIdeas } from '@/lib/notion'

export async function GET() {
  try {
    const ideas = await getIdeas()
    return NextResponse.json(ideas)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 })
  }
}
