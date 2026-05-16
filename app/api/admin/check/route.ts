import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const ok = await isSuperAdmin(req)
  return NextResponse.json({ isSuperAdmin: ok })
}
