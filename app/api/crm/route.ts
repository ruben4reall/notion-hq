import { NextRequest, NextResponse } from 'next/server'
import { getUser, getOrgId } from '@/lib/auth'
import { getCRM, createCRM, createNotification } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json([], { status: 401 })
  const orgId = getOrgId(req)
  if (!orgId) return NextResponse.json([], { status: 400 })
  try {
    return NextResponse.json(await getCRM(orgId))
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = getOrgId(req)
  if (!orgId) return NextResponse.json({ error: 'No project' }, { status: 400 })
  try {
    const body = await req.json()
    await createCRM(orgId, body)
    createNotification({ message: `Nouveau prospect : "${body.enseigne}"`, type: 'info', de: body.modifiedBy || '' }).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
