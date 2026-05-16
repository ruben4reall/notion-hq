'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { playLoginSound } from '@/lib/sounds'

const ORBS = [
  { x: 20,  y: 15,  size: 560, color: '#7c6af5', depth: 0.022, opacity: 0.28 },
  { x: 75,  y: 10,  size: 420, color: '#4f8ef7', depth: 0.035, opacity: 0.22 },
  { x: 80,  y: 72,  size: 500, color: '#ec4899', depth: 0.018, opacity: 0.18 },
  { x: 12,  y: 78,  size: 460, color: '#0ec98c', depth: 0.028, opacity: 0.16 },
  { x: 50,  y: 48,  size: 380, color: '#7c6af5', depth: 0.042, opacity: 0.12 },
]

function GlowBackground() {
  const mouseRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number | undefined>(undefined)
  const orbsRef = useRef<(HTMLDivElement | null)[]>([])
  const smoothRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth  - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      }
    }
    window.addEventListener('mousemove', onMove, { passive: true })

    const animate = () => {
      // Smooth lerp toward mouse
      smoothRef.current.x += (mouseRef.current.x - smoothRef.current.x) * 0.06
      smoothRef.current.y += (mouseRef.current.y - smoothRef.current.y) * 0.06
      const { x, y } = smoothRef.current

      orbsRef.current.forEach((el, i) => {
        if (!el) return
        const orb = ORBS[i]
        const tx = x * orb.depth * window.innerWidth
        const ty = y * orb.depth * window.innerHeight
        const scale = 1 + Math.abs(x * y) * orb.depth * 0.6
        el.style.transform = `translate3d(calc(-50% + ${tx}px), calc(-50% + ${ty}px), 0) scale(${scale})`
      })

      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {ORBS.map((orb, i) => (
        <div
          key={i}
          ref={el => { orbsRef.current[i] = el }}
          style={{
            position: 'absolute',
            left: `${orb.x}%`,
            top:  `${orb.y}%`,
            width:  orb.size,
            height: orb.size,
            borderRadius: '50%',
            background: orb.color,
            opacity: orb.opacity,
            filter: `blur(${orb.size * 0.28}px)`,
            willChange: 'transform',
            transform: 'translate3d(-50%, -50%, 0)',
          }}
        />
      ))}
      {/* Subtle noise grain overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
        backgroundSize: '256px 256px',
        opacity: 0.35,
        mixBlendMode: 'overlay',
      }} />
    </div>
  )
}

const COLORS = ['#7c6af5', '#4f8ef7', '#0ec98c', '#f59e0b', '#ef4444', '#ec4899']

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: 'var(--bg-2)', border: '1px solid var(--border-m)',
  borderRadius: 10, color: 'var(--t0)', fontSize: 14,
  outline: 'none', transition: 'border-color 0.15s',
}

function focusIn(e: React.FocusEvent<HTMLInputElement>) { e.target.style.borderColor = 'var(--accent)' }
function focusOut(e: React.FocusEvent<HTMLInputElement>) { e.target.style.borderColor = 'var(--border-m)' }

function AuthForm() {
  const router = useRouter()
  const params = useSearchParams()
  const redirect = params.get('redirect') || '/org'
  const supabase = createClient()

  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [celebrating, setCelebrating] = useState(false)
  const [celebText, setCelebText] = useState('Bienvenue !')

  useEffect(() => {
    supabase.auth.getSession().then((res: Awaited<ReturnType<typeof supabase.auth.getSession>>) => {
      if (res.data.session) router.replace(redirect)
    })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }
    playLoginSound()
    setLoading(false)
    setCelebText('Bienvenue !')
    setCelebrating(true)
    setTimeout(() => router.push(redirect), 1300)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (password.length < 8) {
      setError('Mot de passe trop court (minimum 8 caractères)')
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim(), color: selectedColor },
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    playLoginSound()
    setLoading(false)
    setCelebText('Compte créé !')
    setCelebrating(true)
    setTimeout(() => router.push(redirect), 1300)
  }

  return (
    <>
    <GlowBackground />
    {celebrating && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', pointerEvents: 'none',
      }}>
        {/* Ripple expanding circle */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'var(--accent)', flexShrink: 0,
          animation: 'auth-ripple 1.3s var(--ease-out) forwards',
        }} />
        {/* Logo + text on top */}
        <div style={{
          position: 'absolute',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
        }}>
          <div style={{
            width: 68, height: 68, borderRadius: 22,
            background: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            animation: 'auth-logo-bounce 0.7s var(--ease-spring) 0.2s both',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="var(--accent)">
              <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>
            </svg>
          </div>
          <p style={{
            fontSize: 22, fontWeight: 800, color: 'white',
            letterSpacing: '-0.02em',
            animation: 'auth-text-in 0.5s var(--ease-spring) 0.45s both',
          }}>
            {celebText}
          </p>
        </div>
      </div>
    )}
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-0)', padding: '20px 16px',
      position: 'relative', zIndex: 1,
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'rgba(var(--bg-0-rgb, 10,10,15), 0.55)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '36px 32px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 32px var(--accent-glow)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--t0)', letterSpacing: '-0.03em' }}>
            Manager Dashboard
          </h1>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: 'var(--bg-2)', borderRadius: 12,
          padding: 4, marginBottom: 24, border: '1px solid var(--border-s)',
        }}>
          {(['login', 'register'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 9, border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                background: tab === t ? 'var(--accent)' : 'transparent',
                color: tab === t ? 'white' : 'var(--t2)',
              }}
            >
              {t === 'login' ? 'Connexion' : 'Créer un compte'}
            </button>
          ))}
        </div>

        {/* Login form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="vous@exemple.com" style={inputStyle}
                autoComplete="email" autoFocus onFocus={focusIn} onBlur={focusOut}
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Mot de passe
                </label>
                <a
                  href="/auth/forgot-password"
                  style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
                >
                  Mot de passe oublié ?
                </a>
              </div>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••" style={inputStyle}
                autoComplete="current-password" onFocus={focusIn} onBlur={focusOut}
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
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite' }} />
                  Connexion…
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </>
              ) : 'Se connecter'}
            </button>
          </form>
        )}

        {/* Register form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Nom complet
              </label>
              <input
                type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                required placeholder="Prénom Nom" style={inputStyle}
                autoFocus onFocus={focusIn} onBlur={focusOut}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="vous@exemple.com" style={inputStyle}
                autoComplete="email" onFocus={focusIn} onBlur={focusOut}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Mot de passe
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="Minimum 8 caractères" style={inputStyle}
                autoComplete="new-password" onFocus={focusIn} onBlur={focusOut}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Couleur de profil
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {COLORS.map(c => (
                  <button
                    key={c} type="button" onClick={() => setSelectedColor(c)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: c,
                      border: selectedColor === c ? '3px solid white' : '3px solid transparent',
                      outline: selectedColor === c ? `2px solid ${c}` : 'none',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  />
                ))}
              </div>
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
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite' }} />
                  Création…
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </>
              ) : 'Créer mon compte'}
            </button>
          </form>
        )}
      </div>
    </div>
    </>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
