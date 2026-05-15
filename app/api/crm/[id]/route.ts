import { NextResponse } from 'next/server'
import { updateCRM, deleteCRM, createNotification } from '@/lib/notion'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    await updateCRM(params.id, body)
    if (body.status === 'Client' && body.enseigne) {
      createNotification({ message: `🎉 Nouveau client signé : "${body.enseigne}"`, type: 'success', de: body.modifiedBy || '' }).catch(() => {})
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update CRM entry' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await deleteCRM(params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to delete CRM entry' }, { status: 500 })
  }
}
