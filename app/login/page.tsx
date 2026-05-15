'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', { username, password, redirect: false })
    if (result?.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('Identifiant ou mot de passe incorrect')
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    background: 'var(--bg-2)', border: '1px solid var(--border-m)',
    borderRadius: 10, color: 'var(--t0)', fontSize: 14,
    outline: 'none', transition: 'border-color 0.15s',
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-0)', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px var(--accent-glow)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--t0)', letterSpacing: '-0.03em' }}>
            Notion HQ
          </h1>
          <p style={{ fontSize: 13, color: 'var(--t1)', marginTop: 6 }}>
            Connectez-vous à votre espace de travail
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', display: 'block', marginBottom: 7, letterSpacing: '0.02em' }}>
              IDENTIFIANT
            </label>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value)}
              required placeholder="Prénom.Nom" style={inputStyle} autoComplete="username"
              onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-m)' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', display: 'block', marginBottom: 7, letterSpacing: '0.02em' }}>
              MOT DE PASSE
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="••••••••••••••••" style={inputStyle} autoComplete="current-password"
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
              marginTop: 4, height: 44, width: '100%',
              background: loading ? 'rgba(124,106,245,0.5)' : 'var(--accent)',
              color: 'white', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.15s', letterSpacing: '0.01em',
            }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
