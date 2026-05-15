import { NextResponse } from 'next/server'
import { getCRM } from '@/lib/notion'

export async function GET() {
  try {
    const entries = await getCRM()
    return NextResponse.json(entries)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch CRM' }, { status: 500 })
  }
}
