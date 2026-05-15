'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  name: string
  color: string
}

interface AuthContextValue {
  user: AuthUser | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  status: 'loading',
  signOut: async () => {},
})

function toAuthUser(u: User): AuthUser {
  return {
    id: u.id,
    email: u.email!,
    name: (u.user_metadata?.full_name as string) || u.email!,
    color: (u.user_metadata?.color as string) || '#7c6af5',
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then((res: { data: { session: Session | null } }) => {
      const session = res.data.session
      setUser(session?.user ? toAuthUser(session.user) : null)
      setStatus(session?.user ? 'authenticated' : 'unauthenticated')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setUser(session?.user ? toAuthUser(session.user) : null)
      setStatus(session?.user ? 'authenticated' : 'unauthenticated')
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    document.cookie = 'current_org_id=; Max-Age=0; path=/'
  }

  return (
    <AuthContext.Provider value={{ user, status, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
