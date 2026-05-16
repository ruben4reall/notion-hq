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

const SESSION_DURATION = 6 * 60 * 60 * 1000 // 6 hours
const LOGIN_AT_KEY = 'mgr_login_at'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')
  const supabase = createClient()

  const doSignOut = async () => {
    localStorage.removeItem(LOGIN_AT_KEY)
    document.cookie = 'current_org_id=; Max-Age=0; path=/'
    await supabase.auth.signOut()
  }

  useEffect(() => {
    supabase.auth.getSession().then((res: { data: { session: Session | null } }) => {
      const session = res.data.session
      if (session?.user) {
        const loginAt = parseInt(localStorage.getItem(LOGIN_AT_KEY) || '0', 10)
        if (loginAt && Date.now() - loginAt > SESSION_DURATION) {
          doSignOut()
          setUser(null)
          setStatus('unauthenticated')
          return
        }
      }
      setUser(session?.user ? toAuthUser(session.user) : null)
      setStatus(session?.user ? 'authenticated' : 'unauthenticated')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      if (_event === 'SIGNED_IN') {
        localStorage.setItem(LOGIN_AT_KEY, Date.now().toString())
      }
      if (_event === 'SIGNED_OUT') {
        localStorage.removeItem(LOGIN_AT_KEY)
      }
      setUser(session?.user ? toAuthUser(session.user) : null)
      setStatus(session?.user ? 'authenticated' : 'unauthenticated')
    })

    // Check expiry every minute while app is open
    const interval = setInterval(async () => {
      const loginAt = parseInt(localStorage.getItem(LOGIN_AT_KEY) || '0', 10)
      if (loginAt && Date.now() - loginAt > SESSION_DURATION) {
        doSignOut()
        setUser(null)
        setStatus('unauthenticated')
      }
    }, 60_000)

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const signOut = async () => {
    await doSignOut()
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
