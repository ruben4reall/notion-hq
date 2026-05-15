import { NextResponse } from 'next/server'
import { getCRM, createCRM } from '@/lib/notion'

export async function GET() {
  try {
    return NextResponse.json(await getCRM())
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch CRM' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    await createCRM(body)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create CRM entry' }, { status: 500 })
  }
}
