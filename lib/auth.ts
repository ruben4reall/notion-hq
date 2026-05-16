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
  const { data } = await db.from('platform_admins').select('user_id').eq('user_id', user.id).single()
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return {
    id: user.id,
    email: user.email!,
    name: (user.user_metadata?.full_name as string) || user.email!,
    color: (user.user_metadata?.color as string) || '#7c6af5',
  }
}
