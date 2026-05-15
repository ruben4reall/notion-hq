'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

interface Org {
  id: string
  name: string
  slug: string
  role: 'admin' | 'member'
  member_count: number
}

const ORG_COLORS = ['#7c6af5', '#3b82f6', '#0d9488', '#059669', '#e11d48', '#ea580c', '#db2777', '#6366f1']

function orgColor(id: string) {
  let hash = 0
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return ORG_COLORS[Math.abs(hash) % ORG_COLORS.length]
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// ── Netflix-style profile card ──────────────────────────────────────────────

function OrgCard({ org, delay, onSelect }: { org: Org; delay: number; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false)
  const color = orgColor(org.id)
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        transform: hovered ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        animation: `cardIn 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms both`,
      }}
    >
      <div style={{
        width: 96, height: 96, borderRadius: 20,
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, fontWeight: 800, color: 'white',
        boxShadow: hovered ? `0 16px 40px ${color}55` : `0 4px 16px ${color}33`,
        transition: 'box-shadow 0.2s ease',
        border: hovered ? `3px solid white` : '3px solid transparent',
      }}>
        {initials(org.name)}
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 2 }}>{org.name}</p>
        <p style={{ fontSize: 11, color: 'var(--t2)' }}>
          {org.member_count} membre{org.member_count > 1 ? 's' : ''} · {org.role === 'admin' ? 'Admin' : 'Membre'}
        </p>
      </div>
    </button>
  )
}

function AddCard({ delay, onClick }: { delay: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        transform: hovered ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        animation: `cardIn 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms both`,
      }}
    >
      <div style={{
        width: 96, height: 96, borderRadius: 20,
        background: hovered ? 'var(--bg-3)' : 'var(--bg-2)',
        border: `2px dashed ${hovered ? 'var(--accent)' : 'var(--border-m)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color: hovered ? 'var(--accent)' : 'var(--t2)', transition: 'color 0.2s' }}>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: hovered ? 'var(--accent)' : 'var(--t2)', transition: 'color 0.2s' }}>
        Nouveau
      </p>
    </button>
  )
}

// ── Typeform-style multi-step creation form ─────────────────────────────────

const USAGE_OPTIONS = [
  { id: 'startup',   label: 'Startup',       icon: '🚀', desc: 'Équipe en phase de lancement' },
  { id: 'agency',    label: 'Agence',         icon: '🎨', desc: 'Studio ou agence créative' },
  { id: 'freelance', label: 'Freelance',      icon: '💼', desc: 'Projets clients solo' },
  { id: 'team',      label: 'Équipe',         icon: '👥', desc: 'Département ou groupe interne' },
]

function TypeformModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [usage, setUsage] = useState('')
  const [dir, setDir] = useState(1) // 1 = forward, -1 = backward
  const [animKey, setAnimKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 0) setTimeout(() => inputRef.current?.focus(), 320)
  }, [step, animKey])

  const goStep = (next: number) => {
    setDir(next > step ? 1 : -1)
    setAnimKey(k => k + 1)
    setStep(next)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) goStep(1)
    if (e.key === 'Escape') onClose()
  }

  const create = async (selectedUsage: string) => {
    setSaving(true)
    setError('')
    const res = await fetch('/api/orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), usage: selectedUsage }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erreur'); setSaving(false); return }
    onCreated(data.id)
  }

  const slideStyle = (s: number): React.CSSProperties => {
    if (s !== step) return { display: 'none' }
    return {
      animation: `slideStep${dir > 0 ? 'In' : 'Back'} 0.38s cubic-bezier(0.22,1,0.36,1) both`,
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 0.2s ease both',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 520,
        background: 'var(--bg-1)',
        borderRadius: 24,
        border: '1px solid var(--border-m)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        animation: 'floatIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--bg-3)' }}>
          <div style={{
            height: '100%',
            width: `${((step + 1) / 2) * 100}%`,
            background: 'var(--accent)',
            transition: 'width 0.4s cubic-bezier(0.22,1,0.36,1)',
            borderRadius: 2,
          }} />
        </div>

        <div style={{ padding: '48px 40px 40px', minHeight: 300, position: 'relative', overflow: 'hidden' }}>
          {/* Step 0: Name */}
          <div key={`s0-${animKey}`} style={slideStyle(0)}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Question 1 / 2
            </p>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--t0)', letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2 }}>
              Comment s'appelle<br />votre espace ?
            </h2>
            <p style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 32 }}>
              Choisissez un nom qui représente votre projet ou équipe.
            </p>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ex: Mon Projet, Startup XYZ…"
              style={{
                width: '100%', fontSize: 20, fontWeight: 600,
                color: 'var(--t0)', background: 'transparent',
                border: 'none', borderBottom: '2px solid var(--accent)',
                outline: 'none', padding: '8px 0', marginBottom: 40,
                caretColor: 'var(--accent)',
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onClose}
                style={{
                  height: 46, padding: '0 20px', borderRadius: 12,
                  border: '1px solid var(--border-m)', background: 'transparent',
                  color: 'var(--t2)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => name.trim() && goStep(1)}
                disabled={!name.trim()}
                style={{
                  height: 46, padding: '0 28px', borderRadius: 12,
                  border: 'none', background: 'var(--accent)',
                  color: 'white', fontSize: 14, fontWeight: 700, cursor: name.trim() ? 'pointer' : 'not-allowed',
                  opacity: name.trim() ? 1 : 0.4,
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'opacity 0.2s',
                }}
              >
                Continuer
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 14 }}>
              Appuyez sur <kbd style={{ background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 4, fontSize: 10 }}>Entrée ↵</kbd> pour continuer
            </p>
          </div>

          {/* Step 1: Usage */}
          <div key={`s1-${animKey}`} style={slideStyle(1)}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Question 2 / 2
            </p>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--t0)', letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2 }}>
              C'est pour quel<br />type de projet ?
            </h2>
            <p style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 28 }}>
              Sélectionnez ce qui correspond le mieux à <strong style={{ color: 'var(--t1)' }}>{name}</strong>.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
              {USAGE_OPTIONS.map((opt, i) => (
                <button
                  key={opt.id}
                  onClick={() => { setUsage(opt.id); create(opt.id) }}
                  disabled={saving}
                  style={{
                    padding: '16px', borderRadius: 14, textAlign: 'left', cursor: saving ? 'not-allowed' : 'pointer',
                    background: usage === opt.id ? 'rgba(var(--accent-rgb),0.12)' : 'var(--bg-2)',
                    border: `1.5px solid ${usage === opt.id ? 'var(--accent)' : 'var(--border-s)'}`,
                    transition: 'all 0.15s',
                    animation: `cardIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 60}ms both`,
                  }}
                  onMouseEnter={e => { if (usage !== opt.id) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)' }}
                  onMouseLeave={e => { if (usage !== opt.id) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-s)' }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{opt.icon}</div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', marginBottom: 2 }}>{opt.label}</p>
                  <p style={{ fontSize: 11, color: 'var(--t2)' }}>{opt.desc}</p>
                </button>
              ))}
            </div>
            {error && <p style={{ fontSize: 12, color: '#f43f5e', textAlign: 'center', marginBottom: 12 }}>{error}</p>}
            <button
              onClick={() => goStep(0)}
              style={{
                background: 'none', border: 'none', color: 'var(--t2)', fontSize: 13,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Retour
            </button>
          </div>

          {/* Saving overlay */}
          {saving && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'var(--bg-1)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 20,
              animation: 'fadeIn 0.2s ease both',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20, background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'pulse-dot 1s ease-in-out infinite',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>
                </svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--t0)', marginBottom: 4 }}>Création en cours…</p>
                <p style={{ fontSize: 13, color: 'var(--t2)' }}>On prépare votre espace</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideStepIn {
          from { opacity: 0; transform: translateX(48px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideStepBack {
          from { opacity: 0; transform: translateX(-48px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OrgPage() {
  const { user, status } = useAuth()
  const router = useRouter()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selecting, setSelecting] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/auth'); return }
    if (status !== 'authenticated') return
    fetch('/api/orgs')
      .then(r => r.json())
      .then((data: Org[]) => {
        setOrgs(data)
        setLoading(false)
        if (data.length === 1) selectOrg(data[0].id)
      })
      .catch(() => setLoading(false))
  }, [status])

  const selectOrg = async (id: string) => {
    setSelecting(id)
    document.cookie = `current_org_id=${id}; path=/; max-age=${60 * 60 * 24 * 30}`
    router.push('/')
  }

  if (status === 'loading' || loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border-m)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg-0)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 56, animation: 'cardIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16, background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 8px 32px var(--accent-glow)',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: 'var(--t0)', letterSpacing: '-0.03em', marginBottom: 8 }}>
          Quel espace ?
        </h1>
        <p style={{ fontSize: 14, color: 'var(--t2)' }}>
          Connecté en tant que <strong style={{ color: 'var(--t1)' }}>{user?.name}</strong>
        </p>
      </div>

      {/* Profile grid */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 32,
        justifyContent: 'center', maxWidth: 600,
      }}>
        {orgs.map((org, i) => (
          <div key={org.id} style={{ position: 'relative' }}>
            {selecting === org.id && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  border: '2px solid var(--border-m)', borderTopColor: 'var(--accent)',
                  animation: 'spin 0.7s linear infinite',
                }} />
              </div>
            )}
            <OrgCard
              org={org}
              delay={i * 80}
              onSelect={() => selectOrg(org.id)}
            />
          </div>
        ))}
        <AddCard delay={orgs.length * 80} onClick={() => setShowForm(true)} />
      </div>

      {showForm && (
        <TypeformModal
          onClose={() => setShowForm(false)}
          onCreated={id => { setShowForm(false); selectOrg(id) }}
        />
      )}

      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
