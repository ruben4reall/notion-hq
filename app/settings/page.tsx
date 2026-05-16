'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useOnboarding, SECTIONS } from '@/components/Onboarding'
import { ACCENTS, saveAccent, getCurrentAccentId } from '@/lib/accent-color'
import { useLanguage } from '@/context/LanguageContext'
import { LANG_LABELS, type Lang } from '@/lib/i18n'

const LANGS: Lang[] = ['en', 'fr', 'zh']

interface UserSettings {
  name: string
  email: string
  displayName: string | null
  icalFeedUrl: string | null
  avatarUrl: string | null
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  background: 'var(--bg-2)', border: '1px solid var(--border-m)',
  borderRadius: 8, color: 'var(--t0)', fontSize: 13,
  outline: 'none', transition: 'border-color 0.15s',
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="card" style={{ padding: '20px', marginBottom: 16 }}>
      <p className="section-title" style={{ marginBottom: 16 }}>{title}</p>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t2)', letterSpacing: '0.06em', marginBottom: 6, textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 5 }}>{hint}</p>}
    </div>
  )
}

function Alert({ type, message }: { type: 'error' | 'success'; message: string }) {
  const isError = type === 'error'
  return (
    <div style={{
      padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12,
      background: isError ? 'var(--red-bg)' : 'var(--green-bg)',
      border: `1px solid ${isError ? 'rgba(244,63,94,0.2)' : 'rgba(14,201,140,0.2)'}`,
      color: isError ? 'var(--red)' : 'var(--green)',
    }}>
      {message}
    </div>
  )
}

export default function SettingsPage() {
  const { user: session, signOut } = useAuth()
  const { t, lang, setLang } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [superAdmin, setSuperAdmin] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const [icalUrl, setIcalUrl] = useState('')
  const [savingIcal, setSavingIcal] = useState(false)
  const [icalMsg, setIcalMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPicker, setAvatarPicker] = useState(false)
  const [avatarTab, setAvatarTab] = useState<'upload' | 'gif'>('upload')
  const [gifSearch, setGifSearch] = useState('')
  const [gifs, setGifs] = useState<{ id: string; url: string; title: string }[]>([])
  const [loadingGifs, setLoadingGifs] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const exportUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/calendar.ics` : '/api/calendar.ics'

  useEffect(() => {
    const section = searchParams.get('section')
    if (section) {
      const el = document.getElementById(section)
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
      }
    }
  }, [searchParams])

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: UserSettings) => {
        setSettings(data)
        setDisplayName(data.displayName || '')
        setIcalUrl(data.icalFeedUrl || '')
        setAvatarUrl(data.avatarUrl ?? null)
      })
    fetch('/api/admin/check')
      .then(r => r.json())
      .then(d => setSuperAdmin(!!d.isSuperAdmin))
      .catch(() => {})
  }, [])

  const saveName = async () => {
    setSavingName(true)
    setNameMsg(null)
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'displayName', value: displayName }),
      })
      setSettings(prev => prev ? { ...prev, displayName: displayName || null } : prev)
      setNameMsg({ type: 'success', text: t('nameUpdated') })
    } catch {
      setNameMsg({ type: 'error', text: t('saveError') })
    }
    setSavingName(false)
    setTimeout(() => setNameMsg(null), 3000)
  }

  const savePassword = async () => {
    setPwdMsg(null)
    if (newPwd !== confirmPwd) { setPwdMsg({ type: 'error', text: t('passwordMismatch') }); return }
    if (newPwd.length < 8) { setPwdMsg({ type: 'error', text: t('passwordMin') }); return }
    setSavingPwd(true)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'password', newPassword: newPwd }),
    })
    const data = await res.json()
    if (!res.ok) {
      setPwdMsg({ type: 'error', text: data.error || t('genericError') })
    } else {
      setPwdMsg({ type: 'success', text: t('passwordChanged') })
      setNewPwd(''); setConfirmPwd('')
    }
    setSavingPwd(false)
  }

  const saveIcal = async () => {
    setSavingIcal(true)
    setIcalMsg(null)
    try {
      await fetch('/api/calendar/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: icalUrl || null }),
      })
      setSettings(prev => prev ? { ...prev, icalFeedUrl: icalUrl || null } : prev)
      setIcalMsg({ type: 'success', text: icalUrl ? t('calendarConnected') : t('calendarDisconnected') })
    } catch {
      setIcalMsg({ type: 'error', text: t('saveError') })
    }
    setSavingIcal(false)
    setTimeout(() => setIcalMsg(null), 4000)
  }

  const searchGifs = async (q: string) => {
    setLoadingGifs(true)
    try {
      const url = q ? `/api/gifs?q=${encodeURIComponent(q)}` : '/api/gifs'
      const data = await fetch(url).then(r => r.json())
      setGifs(data)
    } catch {}
    setLoadingGifs(false)
  }

  useEffect(() => {
    if (avatarTab === 'gif') searchGifs(gifSearch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarTab])

  const uploadFile = async (file: File) => {
    setUploadingAvatar(true)
    setAvatarMsg(null)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/avatar', { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) {
      setAvatarMsg({ type: 'error', text: data.error || t('uploadError') })
    } else {
      setAvatarUrl(data.url)
      setSettings(prev => prev ? { ...prev, avatarUrl: data.url } : prev)
      setAvatarPicker(false)
      setAvatarMsg({ type: 'success', text: t('avatarUpdated') })
      setTimeout(() => setAvatarMsg(null), 3000)
    }
    setUploadingAvatar(false)
  }

  const pickGif = async (url: string) => {
    setUploadingAvatar(true)
    setAvatarMsg(null)
    const form = new FormData()
    form.append('gifUrl', url)
    const res = await fetch('/api/avatar', { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) {
      setAvatarMsg({ type: 'error', text: data.error || t('genericError') })
    } else {
      setAvatarUrl(data.url)
      setSettings(prev => prev ? { ...prev, avatarUrl: data.url } : prev)
      setAvatarPicker(false)
      setAvatarMsg({ type: 'success', text: t('gifUpdated') })
      setTimeout(() => setAvatarMsg(null), 3000)
    }
    setUploadingAvatar(false)
  }

  const removeAvatar = async () => {
    await fetch('/api/avatar', { method: 'DELETE' })
    setAvatarUrl(null)
    setSettings(prev => prev ? { ...prev, avatarUrl: null } : prev)
  }

  const name = session?.name || ''
  const initials = name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2) || '?'
  const shownName = settings?.displayName || name

  return (
    <div className="page-container animate-in">
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">{t('settingsTitle')}</h1>
        <p className="page-subtitle">{t('settingsSubtitle')}</p>
      </div>

      {/* SuperAdmin */}
      {superAdmin && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: 16, border: '1px solid rgba(244,63,94,0.25)', background: 'rgba(244,63,94,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(244,63,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>{t('superAdminTitle')}</p>
                <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>{t('superAdminHint')}</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/admin')}
              style={{ padding: '8px 16px', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 9, color: '#f43f5e', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {t('openBtn')}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Profile */}
      <Section title={t('profileSection')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-s)' }}>
          {/* Clickable avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setAvatarPicker(v => !v)}
              style={{ width: 52, height: 52, borderRadius: '50%', padding: 0, border: 'none', cursor: 'pointer', position: 'relative', background: 'none' }}
              title={t('changeAvatar')}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'var(--accent)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700,
                }}>
                  {initials}
                </div>
              )}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 20h9" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </button>
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--t0)' }}>{shownName}</p>
            <p style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>
              {settings?.email || '—'}
            </p>
            <button
              onClick={() => setAvatarPicker(v => !v)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0, marginTop: 4 }}
            >
              {t('changeAvatar')}
            </button>
          </div>
        </div>

        {/* Avatar picker panel */}
        {avatarPicker && (
          <div style={{ marginBottom: 16, borderRadius: 12, border: '1px solid var(--border-m)', background: 'var(--bg-2)', overflow: 'hidden' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-s)' }}>
              {(['upload', 'gif'] as const).map(tab => (
                <button key={tab} onClick={() => setAvatarTab(tab)}
                  style={{ flex: 1, padding: '10px 0', fontSize: 12, fontWeight: avatarTab === tab ? 700 : 400, background: 'none', border: 'none', cursor: 'pointer', color: avatarTab === tab ? 'var(--accent)' : 'var(--t2)', borderBottom: avatarTab === tab ? '2px solid var(--accent)' : '2px solid transparent', transition: 'all 0.15s' }}>
                  {tab === 'upload' ? t('uploadTab') : t('gifTab')}
                </button>
              ))}
              {avatarUrl && (
                <button onClick={removeAvatar}
                  style={{ padding: '10px 14px', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', borderBottom: '2px solid transparent' }}>
                  {t('removeAvatar')}
                </button>
              )}
            </div>

            {/* Upload tab */}
            {avatarTab === 'upload' && (
              <div style={{ padding: 16 }}>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f) }} />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) uploadFile(f) }}
                  style={{ border: '2px dashed var(--border-m)', borderRadius: 10, padding: '28px 16px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-m)')}
                >
                  {uploadingAvatar ? (
                    <p style={{ fontSize: 13, color: 'var(--t2)' }}>{t('uploading')}</p>
                  ) : (
                    <>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 10px', color: 'var(--t2)' }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                      <p style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 500 }}>{t('dragOrClick')}</p>
                      <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 4 }}>{t('dragHint')}</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* GIF tab */}
            {avatarTab === 'gif' && (
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <input
                    value={gifSearch}
                    onChange={e => setGifSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') searchGifs(gifSearch) }}
                    placeholder={t('searchGif')}
                    style={{ ...inputStyle, flex: 1, height: 32, padding: '6px 10px', fontSize: 12 }}
                    onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border-m)' }}
                  />
                  <button onClick={() => searchGifs(gifSearch)} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12, flexShrink: 0 }}>
                    OK
                  </button>
                </div>
                {loadingGifs ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                    {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '1', borderRadius: 6 }} />)}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
                    {gifs.map(g => (
                      <button key={g.id} onClick={() => pickGif(g.url)}
                        style={{ padding: 0, border: '2px solid transparent', borderRadius: 6, cursor: 'pointer', overflow: 'hidden', background: 'var(--bg-3)', transition: 'border-color 0.12s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.url} alt={g.title} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                      </button>
                    ))}
                  </div>
                )}
                {!loadingGifs && gifs.length === 0 && (
                  <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--t2)', padding: '20px 0' }}>{t('noResults')}</p>
                )}
              </div>
            )}
          </div>
        )}

        {avatarMsg && <Alert type={avatarMsg.type} message={avatarMsg.text} />}

        <Field label={t('displayName')} hint={t('displayNameHint')}>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder={name}
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-m)' }}
          />
        </Field>

        {nameMsg && <Alert type={nameMsg.type} message={nameMsg.text} />}

        <button
          className="btn btn-primary"
          onClick={saveName}
          disabled={savingName}
        >
          {savingName ? t('saving') : t('save')}
        </button>
      </Section>

      {/* Security */}
      <Section title={t('securitySection')}>
        <Field label={t('newPassword')}>
          <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
            placeholder={t('passwordMin')} style={inputStyle}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-m)' }}
          />
        </Field>
        <Field label={t('confirmPassword')}>
          <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
            placeholder="••••••••" style={inputStyle}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-m)' }}
          />
        </Field>

        {pwdMsg && <Alert type={pwdMsg.type} message={pwdMsg.text} />}

        <button
          className="btn btn-primary"
          onClick={savePassword}
          disabled={savingPwd || !newPwd || !confirmPwd}
        >
          {savingPwd ? t('changingDots') : t('changePassword')}
        </button>
      </Section>

      {/* Calendar */}
      <Section title={t('calendarSection')} id="calendar">
        <Field
          label={t('importCalendarLabel')}
          hint={t('importCalendarHint')}
        >
          <input
            type="text"
            value={icalUrl}
            onChange={e => setIcalUrl(e.target.value)}
            placeholder="https://calendar.google.com/calendar/ical/... ou webcal://..."
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-m)' }}
          />
        </Field>
        <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 14, lineHeight: 1.6 }}>
          {t('calendarHintApple')}<br />
          {t('calendarHintGoogle')}
        </div>

        {icalMsg && <Alert type={icalMsg.type} message={icalMsg.text} />}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={saveIcal} disabled={savingIcal}>
            {savingIcal ? t('saving') : t('connectBtn')}
          </button>
          {settings?.icalFeedUrl && (
            <button
              onClick={async () => {
                setIcalUrl('')
                await fetch('/api/calendar/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: null }) })
                setSettings(prev => prev ? { ...prev, icalFeedUrl: null } : prev)
                setIcalMsg({ type: 'success', text: t('calendarDisconnected') })
                setTimeout(() => setIcalMsg(null), 3000)
              }}
              style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(244,63,94,0.2)', cursor: 'pointer' }}
            >
              {t('disconnectBtn')}
            </button>
          )}
        </div>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-s)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 }}>
            {t('calendarSubscribeTitle')}
          </p>
          <p style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 10, lineHeight: 1.6 }}>
            {t('calendarSubscribeHint')}
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-3)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border-s)' }}>
            <code style={{ fontSize: 11, color: 'var(--accent)', flex: 1, wordBreak: 'break-all' }}>
              {exportUrl}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(exportUrl)}
              style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid rgba(124,106,245,0.2)', cursor: 'pointer', fontSize: 11, fontWeight: 600, flexShrink: 0 }}
            >
              {t('copy')}
            </button>
          </div>
        </div>
      </Section>

      {/* Language */}
      <Section title={t('languageSection')}>
        <p style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 14 }}>{t('languageHint')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {LANGS.map(l => {
            const info = LANG_LABELS[l]
            const active = lang === l
            return (
              <button
                key={l}
                onClick={async () => { await setLang(l) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 14px', borderRadius: 10,
                  border: `2px solid ${active ? 'var(--accent)' : 'var(--border-m)'}`,
                  background: active ? 'var(--accent-bg)' : 'var(--bg-3)',
                  cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 20 }}>{info.flag}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--accent)' : 'var(--t0)' }}>{info.native}</p>
                  {info.native !== info.label && <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 1 }}>{info.label}</p>}
                </div>
                {active && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </button>
            )
          })}
        </div>
      </Section>

      {/* Preferences */}
      <Section title={t('preferencesSection')}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-s)' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t0)' }}>{t('themeLabel')}</p>
            <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>{t('themeHint')}</p>
          </div>
          <ThemeToggle />
        </div>
        <AccentPicker />
      </Section>

      {/* Guide */}
      <OnboardingSettings />

      {/* Session */}
      <Section title={t('sessionSection')}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 13, color: 'var(--t1)' }}>{t('signOutSession')}</p>
          <button
            onClick={() => signOut()}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'var(--red-bg)', color: 'var(--red)',
              border: '1px solid rgba(244,63,94,0.2)', cursor: 'pointer',
            }}
          >
            {t('signOutBtn')}
          </button>
        </div>
      </Section>
    </div>
  )
}

function AccentPicker() {
  const { t } = useLanguage()
  const [activeId, setActiveId] = useState('violet')

  useEffect(() => { setActiveId(getCurrentAccentId()) }, [])

  const pick = (id: string) => {
    setActiveId(id)
    saveAccent(id)
  }

  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t0)', marginBottom: 4 }}>{t('accentLabel')}</p>
      <p style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 12 }}>{t('accentHint')}</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {ACCENTS.map(a => (
          <button
            key={a.id}
            onClick={() => pick(a.id)}
            title={a.label}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: a.color,
              border: activeId === a.id
                ? `3px solid var(--t0)`
                : '3px solid transparent',
              cursor: 'pointer',
              outline: activeId === a.id ? `2px solid ${a.color}` : 'none',
              outlineOffset: 2,
              transition: 'transform 0.15s, outline 0.15s',
              transform: activeId === a.id ? 'scale(1.15)' : 'scale(1)',
              flexShrink: 0,
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 10 }}>
        {t('accentActive')} <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
          {ACCENTS.find(a => a.id === activeId)?.label}
        </span>
      </p>
    </div>
  )
}

function OnboardingSettings() {
  const { t } = useLanguage()
  const { reset, resetSection } = useOnboarding()

  return (
    <Section title={t('guideSectionTitle')}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border-s)' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t0)' }}>{t('reviewAllTitle')}</p>
          <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 3 }}>{t('reviewAllHint')}</p>
        </div>
        <button
          onClick={reset}
          style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: 'var(--accent-bg)', color: 'var(--accent)',
            border: '1px solid rgba(var(--accent-rgb),0.25)', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          {t('reviewAllBtn')}
        </button>
      </div>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
        {t('reviewBySectionLabel')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SECTIONS.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: 'var(--bg-2)', border: '1px solid var(--border-s)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: `${s.color}18`, border: `1px solid ${s.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                {s.emoji}
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t0)' }}>{s.label}</p>
            </div>
            <button
              onClick={() => resetSection(s.id)}
              style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: `${s.color}14`, color: s.color, border: `1px solid ${s.color}25`, cursor: 'pointer' }}
            >
              {t('reviewBtn')}
            </button>
          </div>
        ))}
      </div>
    </Section>
  )
}
