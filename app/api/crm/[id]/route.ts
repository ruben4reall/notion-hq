import { NextRequest, NextResponse } from 'next/server'
import { getUser, getOrgId } from '@/lib/auth'
import { getClient, updateCRM, deleteCRM, createNotification } from '@/lib/db'

async function verifyOwnership(id: string, orgId: string): Promise<boolean> {
  const { data } = await getClient().from('crm').select('id').eq('id', id).eq('org_id', orgId).maybeSingle()
  return !!data
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = getOrgId(req)
  if (!orgId) return NextResponse.json({ error: 'No project' }, { status: 400 })
  try {
    const { id } = await params
    if (!await verifyOwnership(id, orgId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const body = await req.json()
    await updateCRM(id, body)
    if (body.status === 'Client' && body.enseigne) {
      createNotification({ message: `🎉 Nouveau client signé : "${body.enseigne}"`, type: 'success', de: body.modifiedBy || '' }).catch(() => {})
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = getOrgId(req)
  if (!orgId) return NextResponse.json({ error: 'No project' }, { status: 400 })
  try {
    const { id } = await params
    if (!await verifyOwnership(id, orgId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await deleteCRM(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
