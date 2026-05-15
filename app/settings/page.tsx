'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { ThemeToggle } from '@/components/ThemeToggle'

interface UserSettings {
  name: string
  username: string
  displayName: string | null
  hasPasswordOverride: boolean
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  background: 'var(--bg-2)', border: '1px solid var(--border-m)',
  borderRadius: 8, color: 'var(--t0)', fontSize: 13,
  outline: 'none', transition: 'border-color 0.15s',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '20px', marginBottom: 16 }}>
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
  const { data: session } = useSession()
  const [settings, setSettings] = useState<UserSettings | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: UserSettings) => {
        setSettings(data)
        setDisplayName(data.displayName || '')
      })
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
      setNameMsg({ type: 'success', text: 'Nom mis à jour' })
    } catch {
      setNameMsg({ type: 'error', text: 'Erreur lors de la sauvegarde' })
    }
    setSavingName(false)
    setTimeout(() => setNameMsg(null), 3000)
  }

  const savePassword = async () => {
    setPwdMsg(null)
    if (newPwd !== confirmPwd) { setPwdMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas' }); return }
    if (newPwd.length < 8) { setPwdMsg({ type: 'error', text: 'Minimum 8 caractères' }); return }
    setSavingPwd(true)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'password', currentPassword: currentPwd, newPassword: newPwd }),
    })
    const data = await res.json()
    if (!res.ok) {
      setPwdMsg({ type: 'error', text: data.error || 'Erreur' })
    } else {
      setPwdMsg({ type: 'success', text: 'Mot de passe modifié avec succès' })
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    }
    setSavingPwd(false)
  }

  const name = session?.user?.name || ''
  const initials = name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2) || '?'
  const shownName = settings?.displayName || name

  return (
    <div className="page-container animate-in">
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Paramètres</h1>
        <p className="page-subtitle">Gérez votre profil et vos préférences</p>
      </div>

      {/* Profile */}
      <Section title="Profil">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-s)' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--accent)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--t0)' }}>{shownName}</p>
            <p style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>
              @{settings?.username || '—'}
            </p>
          </div>
        </div>

        <Field label="Nom affiché" hint="Remplace votre nom complet partout dans l'app">
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
          {savingName ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </Section>

      {/* Security */}
      <Section title="Sécurité">
        <Field label="Mot de passe actuel">
          <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
            placeholder="••••••••" style={inputStyle}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-m)' }}
          />
        </Field>
        <Field label="Nouveau mot de passe">
          <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
            placeholder="Minimum 8 caractères" style={inputStyle}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-m)' }}
          />
        </Field>
        <Field label="Confirmer le mot de passe">
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
          disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd}
        >
          {savingPwd ? 'Modification…' : 'Changer le mot de passe'}
        </button>
      </Section>

      {/* Preferences */}
      <Section title="Préférences">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t0)' }}>Thème de l&apos;interface</p>
            <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>Sombre ou clair selon votre préférence</p>
          </div>
          <ThemeToggle />
        </div>
      </Section>

      {/* Session */}
      <Section title="Session">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 13, color: 'var(--t1)' }}>Se déconnecter de la session en cours</p>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'var(--red-bg)', color: 'var(--red)',
              border: '1px solid rgba(244,63,94,0.2)', cursor: 'pointer',
            }}
          >
            Déconnexion
          </button>
        </div>
      </Section>
    </div>
  )
}
