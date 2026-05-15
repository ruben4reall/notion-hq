import { NextRequest } from 'next/server'
import { createRouteClient } from './supabase/server'

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
