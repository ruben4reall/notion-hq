import { NextRequest } from 'next/server'
import { createRouteClient } from './supabase/server'
import { getClient } from './db'

export function getOrgId(req: NextRequest): string | null {
  return req.cookies.get('current_org_id')?.value || null
}

export async function isSuperAdmin(req: NextRequest): Promise<boolean> {
  const user = await getUser(req)
  if (!user) return false
  const db = getClient()
  const { data } = await db.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  return !!data
}

export interface AuthUser {
  id: string
  email: string
  name: string
  color: string
}

export async function getUser(req: NextRequest): Promise<AuthUser | null> {
  const supabase = createRouteClient(req)
  // Use getSession() — reads JWT from cookie locally, no network round-trip.
  // The JWT is still cryptographically signed by Supabase; we just skip the
  // remote revocation check, which is acceptable for this internal dashboard.
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null
  const user = session.user
  return {
    id: user.id,
    email: user.email!,
    name: (user.user_metadata?.full_name as string) || user.email!,
    color: (user.user_metadata?.color as string) || '#7c6af5',
  }
}
