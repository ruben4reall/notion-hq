'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

interface Org {
  id: string
  name: string
  slug: string
  role: 'admin' | 'member'
  member_count: number
}

function OrgCard({ org, onSelect }: { org: Org; onSelect: () => void }) {
  const initials = org.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%', padding: '16px 20px', borderRadius: 14,
        background: 'var(--bg-2)', border: '1px solid var(--border-s)',
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', gap: 14,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-s)'
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 700, color: 'white', flexShrink: 0,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--t0)', margin: 0 }}>{org.name}</p>
        <p style={{ fontSize: 12, color: 'var(--t2)', margin: 0 }}>
          {org.member_count} membre{org.member_count > 1 ? 's' : ''} · {org.role === 'admin' ? 'Admin' : 'Membre'}
        </p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--t2)', flexShrink: 0 }}>
        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

export default function OrgPage() {
  const { user, status } = useAuth()
  const router = useRouter()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
    document.cookie = `current_org_id=${id}; path=/; max-age=${60 * 60 * 24 * 30}`
    router.push('/')
  }

  const createOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName.trim()) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newOrgName.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erreur'); setSaving(false); return }
    selectOrg(data.id)
  }

  if (status === 'loading' || loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border-m)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-0)', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 32px var(--accent-glow)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>
            </svg>
          </div>
          <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 4 }}>
            Connecté en tant que <strong style={{ color: 'var(--t1)' }}>{user?.name}</strong>
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t0)', letterSpacing: '-0.02em' }}>
            {orgs.length === 0 ? 'Créer votre premier espace' : 'Choisir un espace'}
          </h1>
        </div>

        {/* Org list */}
        {orgs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {orgs.map(org => (
              <OrgCard key={org.id} org={org} onSelect={() => selectOrg(org.id)} />
            ))}
          </div>
        )}

        {/* Create org */}
        {creating ? (
          <form onSubmit={createOrg} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              autoFocus value={newOrgName} onChange={e => setNewOrgName(e.target.value)}
              placeholder="Nom de l'espace de travail"
              style={{
                width: '100%', padding: '12px 14px',
                background: 'var(--bg-2)', border: '1px solid var(--accent)',
                borderRadius: 10, color: 'var(--t0)', fontSize: 14, outline: 'none',
              }}
            />
            {error && <p style={{ fontSize: 12, color: 'var(--red)', textAlign: 'center' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button" onClick={() => setCreating(false)}
                style={{
                  flex: 1, height: 42, borderRadius: 10, border: '1px solid var(--border-m)',
                  background: 'transparent', color: 'var(--t1)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                type="submit" disabled={saving || !newOrgName.trim()}
                style={{
                  flex: 2, height: 42, borderRadius: 10, border: 'none',
                  background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Création…' : 'Créer'}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            style={{
              width: '100%', height: 48, borderRadius: 12,
              border: '2px dashed var(--border-m)', background: 'transparent',
              color: 'var(--t2)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-m)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--t2)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Créer un espace de travail
          </button>
        )}
      </div>
    </div>
  )
}
