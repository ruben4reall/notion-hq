import { NextResponse } from 'next/server'
import { updateCRMStatus } from '@/lib/notion'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json()
    await updateCRMStatus(params.id, status)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update CRM entry' }, { status: 500 })
  }
}
