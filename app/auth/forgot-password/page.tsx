'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: 'var(--bg-2)', border: '1px solid var(--border-m)',
  borderRadius: 10, color: 'var(--t0)', fontSize: 14,
  outline: 'none', transition: 'border-color 0.15s',
}

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const origin = window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

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
            {t('forgotPasswordTitle')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--t1)', marginTop: 6 }}>
            {sent ? t('emailSent') : t('forgotPasswordSub')}
          </p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              padding: '20px', borderRadius: 12, marginBottom: 24,
              background: 'rgba(14,201,140,0.08)', border: '1px solid rgba(14,201,140,0.2)',
            }}>
              <p style={{ fontSize: 14, color: 'var(--green)', lineHeight: 1.6 }}>
                {t('resetLinkSentTo', { n: email })}<br/>
                {t('checkSpam')}
              </p>
            </div>
            <Link href="/auth" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              {t('backToLogin')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {t('email')}
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder={t('emailPlaceholder')} style={inputStyle} autoFocus
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
                  {t('sending')}
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </>
              ) : t('sendLink')}
            </button>
            <div style={{ textAlign: 'center' }}>
              <Link href="/auth" style={{ fontSize: 13, color: 'var(--t2)', textDecoration: 'none' }}>
                {t('backToLogin')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
