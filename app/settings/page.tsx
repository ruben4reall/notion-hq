'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useOnboarding, OnboardingModal } from '@/components/Onboarding'

interface UserSettings {
  name: string
  username: string
  displayName: string | null
  hasPasswordOverride: boolean
  icalFeedUrl: string | null
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

  const [icalUrl, setIcalUrl] = useState('')
  const [savingIcal, setSavingIcal] = useState(false)
  const [icalMsg, setIcalMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const exportUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/calendar.ics` : '/api/calendar.ics'

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: UserSettings) => {
        setSettings(data)
        setDisplayName(data.displayName || '')
        setIcalUrl(data.icalFeedUrl || '')
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
      setIcalMsg({ type: 'success', text: icalUrl ? 'Calendrier connecté !' : 'Calendrier déconnecté' })
    } catch {
      setIcalMsg({ type: 'error', text: 'Erreur lors de la sauvegarde' })
    }
    setSavingIcal(false)
    setTimeout(() => setIcalMsg(null), 4000)
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

      {/* Calendar */}
      <Section title="Calendrier">
        <Field
          label="Importer un calendrier externe"
          hint="Collez l'URL iCal de votre Apple Calendar ou Google Calendar. Vos évènements apparaîtront dans l'app."
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
          <strong style={{ color: 'var(--t1)' }}>Apple Calendar :</strong> Faites un clic droit sur un calendrier → &quot;Partager le calendrier&quot; → copiez le lien<br />
          <strong style={{ color: 'var(--t1)' }}>Google Calendar :</strong> Paramètres → votre agenda → &quot;URL au format iCal&quot;
        </div>

        {icalMsg && <Alert type={icalMsg.type} message={icalMsg.text} />}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={saveIcal} disabled={savingIcal}>
            {savingIcal ? 'Enregistrement…' : 'Connecter'}
          </button>
          {settings?.icalFeedUrl && (
            <button
              onClick={async () => {
                setIcalUrl('')
                await fetch('/api/calendar/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: null }) })
                setSettings(prev => prev ? { ...prev, icalFeedUrl: null } : prev)
                setIcalMsg({ type: 'success', text: 'Calendrier déconnecté' })
                setTimeout(() => setIcalMsg(null), 3000)
              }}
              style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(244,63,94,0.2)', cursor: 'pointer' }}
            >
              Déconnecter
            </button>
          )}
        </div>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-s)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 }}>
            Abonnez-vous depuis Apple/Google Calendar
          </p>
          <p style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 10, lineHeight: 1.6 }}>
            Copiez cette URL dans Google Calendar → &quot;Autres agendas&quot; → &quot;Via une URL&quot; ou Apple Calendar → Fichier → Nouvel abonnement. Vos tâches et évènements de l&apos;app apparaîtront dans votre calendrier.
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-3)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border-s)' }}>
            <code style={{ fontSize: 11, color: 'var(--accent)', flex: 1, wordBreak: 'break-all' }}>
              {exportUrl}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(exportUrl)}
              style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid rgba(124,106,245,0.2)', cursor: 'pointer', fontSize: 11, fontWeight: 600, flexShrink: 0 }}
            >
              Copier
            </button>
          </div>
        </div>
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

      {/* Guide */}
      <OnboardingSettings />

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

function OnboardingSettings() {
  const { show, reset, complete } = useOnboarding()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Section title="Guide de l'application">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--t1)' }}>Revoir le guide de démarrage</p>
            <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 3 }}>S'affiche automatiquement à la première connexion</p>
          </div>
          <button
            onClick={() => { reset(); setOpen(true) }}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'var(--accent-bg)', color: 'var(--accent)',
              border: '1px solid rgba(124,106,245,0.2)', cursor: 'pointer',
            }}
          >
            Revoir le guide
          </button>
        </div>
      </Section>
      {open && <OnboardingModal onClose={() => { complete(); setOpen(false) }} />}
    </>
  )
}
