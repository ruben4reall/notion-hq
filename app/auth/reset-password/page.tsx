'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: 'var(--bg-2)', border: '1px solid var(--border-m)',
  borderRadius: 10, color: 'var(--t0)', fontSize: 14,
  outline: 'none', transition: 'border-color 0.15s',
}

function ResetForm() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase sets the session automatically when the user arrives via the reset link
    supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    if (password.length < 8) { setError('Minimum 8 caractères'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/auth?reset=success')
  }

  if (!ready) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--t1)', fontSize: 14, paddingTop: 40 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border-m)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        Vérification du lien…
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Nouveau mot de passe
        </label>
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          required placeholder="Minimum 8 caractères" style={inputStyle} autoFocus
          onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-m)' }}
        />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Confirmer le mot de passe
        </label>
        <input
          type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          required placeholder="••••••••" style={inputStyle}
          onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-m)' }}
        />
      </div>
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: 'var(--red-bg)', border: '1px solid rgba(244,63,94,0.2)',
          fontSize: 13, color: 'var(--red)', textAlign: 'center',
        }}>
          {error}
        </div>
      )}
      <button
        type="submit" disabled={loading}
        style={{
          height: 44, width: '100%',
          background: loading ? 'rgba(124,106,245,0.5)' : 'var(--accent)',
          color: 'white', border: 'none', borderRadius: 10,
          fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {loading ? (
          <>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite' }} />
            Mise à jour…
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        ) : 'Mettre à jour le mot de passe'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-0)', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 32px var(--accent-glow)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t0)', letterSpacing: '-0.02em' }}>
            Nouveau mot de passe
          </h1>
        </div>
        <Suspense>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  )
}
