'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useOnboarding, SECTIONS } from '@/components/Onboarding'
import { ACCENTS, saveAccent, getCurrentAccentId } from '@/lib/accent-color'

interface UserSettings {
  name: string
  email: string
  displayName: string | null
  icalFeedUrl: string | null
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
      body: JSON.stringify({ type: 'password', newPassword: newPwd }),
    })
    const data = await res.json()
    if (!res.ok) {
      setPwdMsg({ type: 'error', text: data.error || 'Erreur' })
    } else {
      setPwdMsg({ type: 'success', text: 'Mot de passe modifié avec succès' })
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
      setIcalMsg({ type: 'success', text: icalUrl ? 'Calendrier connecté !' : 'Calendrier déconnecté' })
    } catch {
      setIcalMsg({ type: 'error', text: 'Erreur lors de la sauvegarde' })
    }
    setSavingIcal(false)
    setTimeout(() => setIcalMsg(null), 4000)
  }

  const name = session?.name || ''
  const initials = name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2) || '?'
  const shownName = settings?.displayName || name

  return (
    <div className="page-container animate-in">
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Paramètres</h1>
        <p className="page-subtitle">Gérez votre profil et vos préférences</p>
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
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>Dashboard SuperAdmin</p>
                <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>Métriques, utilisateurs et activité de la plateforme</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/admin')}
              style={{ padding: '8px 16px', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 9, color: '#f43f5e', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              Ouvrir
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      )}

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
              {settings?.email || '—'}
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
          disabled={savingPwd || !newPwd || !confirmPwd}
        >
          {savingPwd ? 'Modification…' : 'Changer le mot de passe'}
        </button>
      </Section>

      {/* Calendar */}
      <Section title="Calendrier" id="calendar">
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-s)' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t0)' }}>Thème de l&apos;interface</p>
            <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>Sombre ou clair selon votre préférence</p>
          </div>
          <ThemeToggle />
        </div>
        <AccentPicker />
      </Section>

      {/* Guide */}
      <OnboardingSettings />

      {/* Session */}
      <Section title="Session">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 13, color: 'var(--t1)' }}>Se déconnecter de la session en cours</p>
          <button
            onClick={() => signOut()}
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

function AccentPicker() {
  const [activeId, setActiveId] = useState('violet')

  useEffect(() => { setActiveId(getCurrentAccentId()) }, [])

  const pick = (id: string) => {
    setActiveId(id)
    saveAccent(id)
  }

  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t0)', marginBottom: 4 }}>Couleur d&apos;accentuation</p>
      <p style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 12 }}>Couleur des boutons, liens et éléments actifs</p>
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
        Couleur active : <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
          {ACCENTS.find(a => a.id === activeId)?.label}
        </span>
      </p>
    </div>
  )
}

function OnboardingSettings() {
  const { reset, resetSection } = useOnboarding()

  return (
    <Section title="Guide de l'application">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border-s)' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t0)' }}>Revoir tout le guide</p>
          <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 3 }}>Recommence le tour interactif complet depuis le début</p>
        </div>
        <button
          onClick={reset}
          style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: 'var(--accent-bg)', color: 'var(--accent)',
            border: '1px solid rgba(var(--accent-rgb),0.25)', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          Revoir tout
        </button>
      </div>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
        Revoir par section
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
              Revoir
            </button>
          </div>
        ))}
      </div>
    </Section>
  )
}
