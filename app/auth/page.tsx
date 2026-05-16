'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { playLoginSound } from '@/lib/sounds'
import { t as i18n, LANG_LABELS, type Lang } from '@/lib/i18n'

const COLORS = ['#7c6af5', '#4f8ef7', '#0ec98c', '#f59e0b', '#ef4444', '#ec4899']
const LANGS: Lang[] = ['en', 'fr', 'zh']

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
  const [selectedLang, setSelectedLang] = useState<Lang>(() => {
    if (typeof navigator === 'undefined') return 'fr'
    const code = navigator.language.slice(0, 2)
    if (code === 'en') return 'en'
    if (code === 'zh') return 'zh'
    return 'fr'
  })
  const [registerStep, setRegisterStep] = useState<'form' | 'language'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [celebrating, setCelebrating] = useState(false)
  const [celebText, setCelebText] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then((res: Awaited<ReturnType<typeof supabase.auth.getSession>>) => {
      if (res.data.session) router.replace(redirect)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(i18n(selectedLang, 'loginError'))
      setLoading(false)
      return
    }
    playLoginSound()
    setLoading(false)
    setCelebText(i18n(selectedLang, 'welcomeBack'))
    setCelebrating(true)
    router.refresh()
    setTimeout(() => router.push(redirect), 1300)
  }

  const handleRegisterFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError(i18n(selectedLang, 'passwordTooShort'))
      return
    }
    setError('')
    setRegisterStep('language')
  }

  const handleRegister = async () => {
    setLoading(true)
    setError('')
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
      setRegisterStep('form')
      return
    }
    // Save language preference immediately after signup
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'language', value: selectedLang }),
    }).catch(() => {})
    playLoginSound()
    setLoading(false)
    setCelebText(i18n(selectedLang, 'accountCreated'))
    setCelebrating(true)
    router.refresh()
    setTimeout(() => router.push(redirect), 1300)
  }

  return (
    <>
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
      justifyContent: 'center', background: 'var(--bg-0)', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
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
          {(['login', 'register'] as const).map(tabVal => (
            <button
              key={tabVal}
              onClick={() => { setTab(tabVal); setError('') }}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 9, border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                background: tab === tabVal ? 'var(--accent)' : 'transparent',
                color: tab === tabVal ? 'white' : 'var(--t2)',
              }}
            >
              {tabVal === 'login' ? i18n(selectedLang, 'signIn') : i18n(selectedLang, 'signUp')}
            </button>
          ))}
        </div>

        {/* Login form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {i18n(selectedLang, 'email')}
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder={i18n(selectedLang, 'emailPlaceholder')} style={inputStyle}
                autoComplete="email" autoFocus onFocus={focusIn} onBlur={focusOut}
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {i18n(selectedLang, 'password')}
                </label>
                <a
                  href="/auth/forgot-password"
                  style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
                >
                  {i18n(selectedLang, 'forgotPassword')}
                </a>
              </div>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder={i18n(selectedLang, 'passwordCurrentPlaceholder')} style={inputStyle}
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
                  {i18n(selectedLang, 'signingIn')}
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </>
              ) : i18n(selectedLang, 'login')}
            </button>
          </form>
        )}

        {/* Register form — step 1: info */}
        {tab === 'register' && registerStep === 'form' && (
          <form onSubmit={handleRegisterFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {i18n(selectedLang, 'fullName')}
              </label>
              <input
                type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                required placeholder={i18n(selectedLang, 'namePlaceholder')} style={inputStyle}
                autoFocus onFocus={focusIn} onBlur={focusOut}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {i18n(selectedLang, 'email')}
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder={i18n(selectedLang, 'emailPlaceholder')} style={inputStyle}
                autoComplete="email" onFocus={focusIn} onBlur={focusOut}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {i18n(selectedLang, 'password')}
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder={i18n(selectedLang, 'passwordPlaceholder')} style={inputStyle}
                autoComplete="new-password" onFocus={focusIn} onBlur={focusOut}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {i18n(selectedLang, 'profileColor')}
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
              type="submit"
              style={{
                marginTop: 4, height: 44, width: '100%',
                background: 'var(--accent)',
                color: 'white', border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {i18n(selectedLang, 'continue')}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </form>
        )}

        {/* Register form — step 2: language */}
        {tab === 'register' && registerStep === 'language' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--t0)', marginBottom: 4 }}>{i18n(selectedLang, 'chooseLanguage')}</p>
              <p style={{ fontSize: 12, color: 'var(--t2)' }}>{i18n(selectedLang, 'chooseLanguageSub')}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {LANGS.map(l => {
                const info = LANG_LABELS[l]
                const active = selectedLang === l
                return (
                  <button
                    key={l}
                    onClick={() => setSelectedLang(l)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 12,
                      border: `2px solid ${active ? 'var(--accent)' : 'var(--border-m)'}`,
                      background: active ? 'var(--accent-bg)' : 'var(--bg-2)',
                      cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{info.flag}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: active ? 'var(--accent)' : 'var(--t0)' }}>{info.native}</p>
                      {info.native !== info.label && (
                        <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 1 }}>{info.label}</p>
                      )}
                    </div>
                    {active && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12l5 5L20 7" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                )
              })}
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

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setRegisterStep('form')}
                style={{
                  height: 44, padding: '0 16px',
                  background: 'var(--bg-2)', color: 'var(--t1)',
                  border: '1px solid var(--border-m)', borderRadius: 10,
                  fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {i18n(selectedLang, 'back')}
              </button>
              <button
                onClick={handleRegister}
                disabled={loading}
                style={{
                  flex: 1, height: 44,
                  background: loading ? 'rgba(124,106,245,0.5)' : 'var(--accent)',
                  color: 'white', border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite' }} />
                    {i18n(selectedLang, 'creating')}
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </>
                ) : i18n(selectedLang, 'register')}
              </button>
            </div>
          </div>
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
