import { NextResponse } from 'next/server'
import { getCRM, createCRM, createNotification } from '@/lib/db'

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
    createNotification({ message: `Nouveau prospect : "${body.enseigne}"`, type: 'info', de: body.modifiedBy || '' }).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create CRM entry' }, { status: 500 })
  }
}
