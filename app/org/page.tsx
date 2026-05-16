'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'

interface Project {
  id: string
  name: string
  slug: string
  role: 'admin' | 'member'
  member_count: number
}

interface Member {
  id: string
  name: string
  email: string
  role: string
}

interface Invitation {
  id: string
  org_id: string
  project_name: string
}

const COLORS = ['#7c6af5', '#3b82f6', '#0d9488', '#059669', '#e11d48', '#ea580c', '#db2777', '#6366f1']

function projectColor(id: string) {
  let hash = 0
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return COLORS[Math.abs(hash) % COLORS.length]
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// ── Project card ──────────────────────────────────────────────────────────────

function ProjectCard({ project, delay, onSelect, onManage }: {
  project: Project
  delay: number
  onSelect: () => void
  onManage: (e: React.MouseEvent) => void
}) {
  const { t } = useLanguage()
  const [hovered, setHovered] = useState(false)
  const color = projectColor(project.id)
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        animation: `cardIn 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms both`,
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onSelect}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          transform: hovered ? 'scale(1.06)' : 'scale(1)',
          transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
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
          {initials(project.name)}
        </div>
      </button>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 2 }}>{project.name}</p>
        <p style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 6 }}>
          {t('memberCountN', { n: project.member_count })} · {project.role === 'admin' ? 'Admin' : t('memberRole')}
        </p>
        <button
          onClick={onManage}
          style={{
            fontSize: 11, fontWeight: 600, color: 'var(--accent)',
            background: 'rgba(var(--accent-rgb),0.1)', border: 'none',
            borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
            opacity: hovered ? 1 : 0.6, transition: 'opacity 0.2s',
          }}
        >
          {t('manage')}
        </button>
      </div>
    </div>
  )
}

function AddCard({ delay, onClick, disabled }: { delay: number; onClick: () => void; disabled: boolean }) {
  const { t } = useLanguage()
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', padding: 0,
        transform: hovered && !disabled ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        opacity: disabled ? 0.4 : 1,
        animation: `cardIn 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms both`,
      }}
    >
      <div style={{
        width: 96, height: 96, borderRadius: 20,
        background: hovered && !disabled ? 'var(--bg-3)' : 'var(--bg-2)',
        border: `2px dashed ${hovered && !disabled ? 'var(--accent)' : 'var(--border-m)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color: hovered && !disabled ? 'var(--accent)' : 'var(--t2)', transition: 'color 0.2s' }}>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: hovered && !disabled ? 'var(--accent)' : 'var(--t2)', transition: 'color 0.2s' }}>
          {t('newProjectLabel')}
        </p>
        {disabled && <p style={{ fontSize: 10, color: 'var(--t2)' }}>{t('maxProjects')}</p>}
      </div>
    </button>
  )
}

// ── Typeform creation modal ───────────────────────────────────────────────────

const USAGE_ICONS = [
  { id: 'startup', icon: '🚀' },
  { id: 'agency', icon: '🎨' },
  { id: 'freelance', icon: '💼' },
  { id: 'team', icon: '👥' },
]

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { t } = useLanguage()
  const USAGE_OPTIONS = [
    { id: 'startup', label: 'Startup', icon: '🚀', desc: t('orgTypeStartup') },
    { id: 'agency', label: t('orgTypeAgency'), icon: '🎨', desc: t('orgTypeAgencyDesc') },
    { id: 'freelance', label: 'Freelance', icon: '💼', desc: t('orgTypeFreelanceDesc') },
    { id: 'team', label: t('teamLabel'), icon: '👥', desc: t('orgTypeTeamDesc') },
  ]
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [usage, setUsage] = useState('')
  const [dir, setDir] = useState(1)
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

  const create = async (selectedUsage: string) => {
    setSaving(true)
    setError('')
    const res = await fetch('/api/orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), usage: selectedUsage }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || t('genericError')); setSaving(false); return }
    onCreated(data.id)
  }

  const slideStyle = (s: number): React.CSSProperties => {
    if (s !== step) return { display: 'none' }
    return { animation: `slideStep${dir > 0 ? 'In' : 'Back'} 0.38s cubic-bezier(0.22,1,0.36,1) both` }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        animation: 'fadeIn 0.2s ease both',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 520, background: 'var(--bg-1)', borderRadius: 24,
        border: '1px solid var(--border-m)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        overflow: 'hidden', animation: 'floatIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        <div style={{ height: 3, background: 'var(--bg-3)' }}>
          <div style={{
            height: '100%', width: `${((step + 1) / 2) * 100}%`,
            background: 'var(--accent)', transition: 'width 0.4s cubic-bezier(0.22,1,0.36,1)', borderRadius: 2,
          }} />
        </div>
        <div style={{ padding: '48px 40px 40px', minHeight: 300, position: 'relative', overflow: 'hidden' }}>
          <div key={`s0-${animKey}`} style={slideStyle(0)}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Question 1 / 2</p>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--t0)', letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2 }}>{t('orgCreateQuestion1')}<br />{t('orgCreateQuestion1b')}</h2>
            <p style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 32 }}>{t('orgProjectNameHint')}</p>
            <input
              ref={inputRef} value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) goStep(1); if (e.key === 'Escape') onClose() }}
              placeholder="Ex: Mon Projet, Startup XYZ…"
              style={{
                width: '100%', fontSize: 20, fontWeight: 600, color: 'var(--t0)',
                background: 'transparent', border: 'none', borderBottom: '2px solid var(--accent)',
                outline: 'none', padding: '8px 0', marginBottom: 40, caretColor: 'var(--accent)',
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ height: 46, padding: '0 20px', borderRadius: 12, border: '1px solid var(--border-m)', background: 'transparent', color: 'var(--t2)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{t('cancel')}</button>
              <button onClick={() => name.trim() && goStep(1)} disabled={!name.trim()} style={{ height: 46, padding: '0 28px', borderRadius: 12, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 14, fontWeight: 700, cursor: name.trim() ? 'pointer' : 'not-allowed', opacity: name.trim() ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 8, transition: 'opacity 0.2s' }}>
                {t('continue')}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 14 }}>{t('orgEnterHint')}</p>
          </div>

          <div key={`s1-${animKey}`} style={slideStyle(1)}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Question 2 / 2</p>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--t0)', letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2 }}>{t('orgCreateQuestion2')}<br />{t('orgCreateQuestion2b')}</h2>
            <p style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 28 }}>{t('orgSelectType')} <strong style={{ color: 'var(--t1)' }}>{name}</strong>.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
              {USAGE_OPTIONS.map((opt, i) => (
                <button key={opt.id} onClick={() => { setUsage(opt.id); create(opt.id) }} disabled={saving}
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
            <button onClick={() => goStep(0)} style={{ background: 'none', border: 'none', color: 'var(--t2)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {t('back')}
            </button>
          </div>

          {saving && (
            <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, animation: 'fadeIn 0.2s ease both' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse-dot 1s ease-in-out infinite' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--t0)', marginBottom: 4 }}>{t('creatingProject')}</p>
                <p style={{ fontSize: 13, color: 'var(--t2)' }}>{t('preparingProject')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes slideStepIn { from { opacity: 0; transform: translateX(48px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideStepBack { from { opacity: 0; transform: translateX(-48px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  )
}

// ── Manage project modal ──────────────────────────────────────────────────────

interface AppUser { id: string; name: string; email: string; color: string }

function ManageModal({ project, onClose, onDeleted }: { project: Project; onClose: () => void; onDeleted: () => void }) {
  const { t } = useLanguage()
  const [members, setMembers] = useState<Member[]>([])
  const [pendingInvites, setPendingInvites] = useState<{ id: string; invited_email: string }[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [searchResults, setSearchResults] = useState<AppUser[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const inviteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showDropdown) return
    const handler = (e: MouseEvent) => {
      if (inviteRef.current && !inviteRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDropdown])

  const onInviteInput = (val: string) => {
    setInviteEmail(val)
    setSelectedUser(null)
    setInviteError('')
    setInviteSuccess('')
    clearTimeout(searchTimer.current)
    if (!val.trim()) { setSearchResults([]); setShowDropdown(false); return }
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(val)}`)
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) { setSearchResults(data); setShowDropdown(true) }
      else { setSearchResults([]); setShowDropdown(false) }
    }, 220)
  }

  const pickUser = (u: AppUser) => {
    setSelectedUser(u)
    setInviteEmail(u.email)
    setSearchResults([])
    setShowDropdown(false)
  }

  useEffect(() => {
    fetch(`/api/orgs/${project.id}`)
      .then(r => r.json())
      .then(data => {
        setMembers(data.members || [])
        setPendingInvites(data.pending_invitations || [])
        setLoading(false)
      })
  }, [project.id])

  const invite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError('')
    setInviteSuccess('')
    const res = await fetch(`/api/orgs/${project.id}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setInviteError(data.error); setInviting(false); return }
    setInviteSuccess(t('inviteSent'))
    setInviteEmail('')
    setPendingInvites(p => [...p, { id: Date.now().toString(), invited_email: inviteEmail.trim() }])
    setInviting(false)
  }

  const removeMember = async (userId: string) => {
    await fetch(`/api/orgs/${project.id}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    setMembers(m => m.filter(x => x.id !== userId))
  }

  const deleteProject = async () => {
    await fetch(`/api/orgs/${project.id}`, { method: 'DELETE' })
    onDeleted()
  }

  const color = projectColor(project.id)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.2s ease both' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--bg-1)', borderRadius: 24, border: '1px solid var(--border-m)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', overflow: 'hidden', animation: 'floatIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid var(--border-s)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: 'white', flexShrink: 0 }}>
            {initials(project.name)}
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t0)', marginBottom: 2 }}>{project.name}</h2>
            <p style={{ fontSize: 12, color: 'var(--t2)' }}>{project.role === 'admin' ? t('administratorRole') : t('memberRole')}</p>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div style={{ padding: '20px 28px' }}>
          {/* Members */}
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{t('teamLabel')}</p>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border-m)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                    {initials(m.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--t2)' }}>{m.role === 'admin' ? 'Admin' : t('memberRole')}</p>
                  </div>
                  {project.role === 'admin' && m.role !== 'admin' && (
                    <button onClick={() => removeMember(m.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, padding: '2px 8px' }}>{t('removeBtn')}</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pending invitations */}
          {pendingInvites.length > 0 && (
            <>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>{t('pendingLabel')}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                {pendingInvites.map(inv => (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 10, opacity: 0.7 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--t2)', flexShrink: 0 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.8"/></svg>
                    <p style={{ fontSize: 12, color: 'var(--t1)', flex: 1 }}>{inv.invited_email}</p>
                    <span style={{ fontSize: 10, color: 'var(--t2)', background: 'var(--bg-3)', padding: '2px 6px', borderRadius: 4 }}>{t('pendingLabel')}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Invite form (admin only) */}
          {project.role === 'admin' && (
            <>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>{t('inviteSection')}</p>
              <div ref={inviteRef} style={{ position: 'relative', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {selectedUser ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'var(--bg-2)', border: '1px solid var(--accent)', borderRadius: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: selectedUser.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {selectedUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--t0)', fontWeight: 500, flex: 1 }}>{selectedUser.name}</span>
                      <button onClick={() => { setSelectedUser(null); setInviteEmail('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', lineHeight: 1, padding: 2, fontSize: 14 }}>×</button>
                    </div>
                  ) : (
                    <input
                      value={inviteEmail}
                      onChange={e => onInviteInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && invite()}
                      placeholder="Nom ou email…"
                      style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-2)', border: '1px solid var(--border-m)', borderRadius: 10, color: 'var(--t0)', fontSize: 13, outline: 'none' }}
                    />
                  )}
                  <button
                    onClick={invite} disabled={inviting || !inviteEmail.trim()}
                    style={{ padding: '10px 16px', background: 'var(--accent)', border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 600, cursor: inviting ? 'not-allowed' : 'pointer', opacity: (inviting || !inviteEmail.trim()) ? 0.5 : 1, whiteSpace: 'nowrap' }}
                  >
                    {inviting ? '…' : t('inviteBtn')}
                  </button>
                </div>

                {showDropdown && searchResults.length > 0 && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--bg-2)', border: '1px solid var(--border-m)', borderRadius: 10, padding: 4, zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.35)', animation: 'slideDown 0.15s ease both' }}>
                    {searchResults.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onMouseDown={e => { e.preventDefault(); pickUser(u) }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'none', border: 'none', borderRadius: 7, cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-3)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                          {u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</p>
                          <p style={{ fontSize: 11, color: 'var(--t2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {inviteError && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{inviteError}</p>}
              {inviteSuccess && <p style={{ fontSize: 12, color: '#0d9488', marginBottom: 8 }}>{inviteSuccess}</p>}
            </>
          )}

          {/* Danger zone */}
          {project.role === 'admin' && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-s)' }}>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} style={{ width: '100%', padding: '10px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 10, color: 'var(--red)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {t('deleteProjectBtn')}
                </button>
              ) : (
                <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 10, padding: 16 }}>
                  <p style={{ fontSize: 13, color: 'var(--t0)', marginBottom: 12, fontWeight: 600 }}>{t('deleteProjectConfirmTitle', { n: project.name })}</p>
                  <p style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 14 }}>{t('orgDeleteWarning')}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '8px', background: 'var(--bg-3)', border: 'none', borderRadius: 8, color: 'var(--t1)', fontSize: 13, cursor: 'pointer' }}>{t('cancel')}</button>
                    <button onClick={deleteProject} style={{ flex: 1, padding: '8px', background: 'var(--red)', border: 'none', borderRadius: 8, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{t('delete')}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Invitation button (top-right) ─────────────────────────────────────────────

function InvitationButton({ invitations, onHandled }: { invitations: Invitation[]; onHandled: () => void }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [handling, setHandling] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement | undefined>(undefined)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handle = async (id: string, action: 'accept' | 'decline') => {
    setHandling(id)
    await fetch(`/api/invitations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setHandling(null)
    onHandled()
  }

  const count = invitations.length

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} style={{ position: 'fixed', top: 20, right: 20, zIndex: 200 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 44, height: 44, borderRadius: 12,
          background: open ? 'var(--bg-2)' : 'var(--bg-1)',
          border: `1px solid ${count > 0 ? 'rgba(var(--accent-rgb),0.45)' : 'var(--border-s)'}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
          transition: 'all 0.15s ease',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: count > 0 ? 'var(--accent)' : 'var(--t2)', transition: 'color 0.2s', flexShrink: 0 }}>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8"/>
          <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.8"/>
        </svg>
        {count > 0 && (
          <div style={{
            position: 'absolute', top: -5, right: -5,
            minWidth: 18, height: 18, borderRadius: 9,
            background: 'var(--accent)', border: '2px solid var(--bg-0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: 'white', padding: '0 3px',
          }}>
            {count}
          </div>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 320, background: 'var(--bg-1)', borderRadius: 16,
          border: '1px solid var(--border-m)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          overflow: 'hidden', animation: 'slideDown 0.18s ease both',
        }}>
          <div style={{ padding: '13px 16px 10px', borderBottom: '1px solid var(--border-s)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('invitationsTitle')}</p>
            {count > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 20 }}>
                {t('invitePendingN', { n: count })}
              </span>
            )}
          </div>

          {count === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--border-m)', margin: '0 auto 10px', display: 'block' }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.5"/>
                <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <p style={{ fontSize: 13, color: 'var(--t2)' }}>{t('noInvitations')}</p>
            </div>
          ) : (
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 360, overflowY: 'auto' }}>
              {invitations.map(inv => {
                const color = projectColor(inv.org_id)
                return (
                  <div key={inv.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 10px 10px 8px', borderRadius: 10,
                    background: 'var(--bg-2)',
                    borderLeft: `3px solid ${color}`,
                    animation: 'cardIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8, background: color, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, color: 'white',
                      boxShadow: `0 2px 8px ${color}44`,
                    }}>
                      {initials(inv.project_name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.project_name}</p>
                      <p style={{ fontSize: 11, color: 'var(--t2)' }}>{t('invitationPending')}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => handle(inv.id, 'decline')} disabled={handling === inv.id}
                        style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-3)', border: '1px solid var(--border-m)', borderRadius: 7, color: 'var(--t2)', fontSize: 14, cursor: 'pointer', lineHeight: 1 }}
                      >✕</button>
                      <button
                        onClick={() => handle(inv.id, 'accept')} disabled={handling === inv.id}
                        style={{ padding: '0 10px', height: 28, background: color, border: 'none', borderRadius: 7, color: 'white', fontSize: 11, cursor: handling === inv.id ? 'not-allowed' : 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}
                      >
                        {handling === inv.id ? '…' : t('joinBtn')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OrgPage() {
  const { user, status } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [managing, setManaging] = useState<Project | null>(null)
  const [selecting, setSelecting] = useState<string | null>(null)

  const load = () => {
    Promise.all([
      fetch('/api/orgs').then(r => r.json()),
      fetch('/api/invitations').then(r => r.json()),
    ]).then(([projs, invs]) => {
      setProjects(Array.isArray(projs) ? projs : [])
      setInvitations(Array.isArray(invs) ? invs : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/auth'); return }
    if (status !== 'authenticated') return
    load()
  }, [status, router])

  const selectProject = (id: string) => {
    setSelecting(id)
    document.cookie = `current_org_id=${id}; path=/; max-age=${60 * 60 * 24 * 30}`  // eslint-disable-line react-hooks/immutability
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

  const isAdmin = projects.filter(p => p.role === 'admin').length
  const canCreate = isAdmin < 5

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-0)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40, animation: 'cardIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 32px var(--accent-glow)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: 'var(--t0)', letterSpacing: '-0.03em', marginBottom: 8 }}>{t('myProjectsTitle')}</h1>
        <p style={{ fontSize: 14, color: 'var(--t2)' }}>
          {t('connectedAs')} <strong style={{ color: 'var(--t1)' }}>{user?.name}</strong>
        </p>
      </div>

      <InvitationButton invitations={invitations} onHandled={load} />

      {/* Project grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'center', maxWidth: 640 }}>
        {projects.map((p, i) => (
          <div key={p.id} style={{ position: 'relative' }}>
            {selecting === p.id && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border-m)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
              </div>
            )}
            <ProjectCard
              project={p}
              delay={i * 80}
              onSelect={() => selectProject(p.id)}
              onManage={e => { e.stopPropagation(); setManaging(p) }}
            />
          </div>
        ))}
        <AddCard delay={projects.length * 80} onClick={() => setShowCreate(true)} disabled={!canCreate} />
      </div>

      {projects.length === 0 && !loading && (
        <p style={{ marginTop: 16, fontSize: 13, color: 'var(--t2)', animation: 'fadeIn 0.4s ease both' }}>
          {t('orgNoProjectsHint')}
        </p>
      )}

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={id => { setShowCreate(false); selectProject(id) }} />
      )}

      {managing && (
        <ManageModal
          project={managing}
          onClose={() => setManaging(null)}
          onDeleted={() => { setManaging(null); load() }}
        />
      )}

      <style>{`
        @keyframes cardIn { from { opacity: 0; transform: scale(0.8) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
