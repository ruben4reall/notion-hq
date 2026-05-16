'use client'

import { useState, useEffect, useRef } from 'react'

export interface AppUser {
  name: string
  color: string
}

export function userInitials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

export function UserAvatar({ name, color, size = 22 }: { name: string; color: string; size?: number }) {
  return (
    <div title={name} style={{
      width: size, height: size, borderRadius: '50%',
      background: color, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.42), fontWeight: 700, flexShrink: 0,
      letterSpacing: '-0.02em',
    }}>
      {userInitials(name)}
    </div>
  )
}

interface Props {
  value: string
  onChange: (name: string) => void
  users: AppUser[]
  placeholder?: string
  size?: 'sm' | 'md'
}

export function UserPicker({ value, onChange, users, placeholder = 'Assigner', size = 'md' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = users.find(u => u.name === value)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const isSmall = size === 'sm'

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: isSmall ? '3px 8px 3px 4px' : '6px 10px 6px 6px',
          borderRadius: 100,
          background: selected ? `${selected.color}18` : 'var(--bg-3)',
          border: `1px solid ${selected ? `${selected.color}40` : 'var(--border-m)'}`,
          color: selected ? selected.color : 'var(--t2)',
          cursor: 'pointer', fontSize: isSmall ? 11 : 12, fontWeight: 500,
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {selected ? (
          <>
            <UserAvatar name={selected.name} color={selected.color} size={isSmall ? 16 : 20} />
            {selected.name.split(' ')[0]}
          </>
        ) : (
          <>
            <svg width={isSmall ? 12 : 14} height={isSmall ? 12 : 14} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            {placeholder}
          </>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
          background: 'var(--bg-2)', border: '1px solid var(--border-m)',
          borderRadius: 10, padding: 4, minWidth: 160,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'slideDown 0.18s var(--ease-spring) both',
        }}>
          {/* Clear option */}
          {value && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 7, background: 'none', border: 'none',
                color: 'var(--t2)', fontSize: 12, cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px dashed var(--border-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--t2)' }}>×</div>
              Aucun
            </button>
          )}

          {users.map(user => (
            <button
              key={user.name}
              type="button"
              onClick={() => { onChange(user.name); setOpen(false) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 7, background: value === user.name ? `${user.color}18` : 'none',
                border: 'none', color: value === user.name ? user.color : 'var(--t0)',
                fontSize: 12, cursor: 'pointer', textAlign: 'left', fontWeight: value === user.name ? 600 : 400,
              }}
            >
              <UserAvatar name={user.name} color={user.color} size={20} />
              {user.name}
              {value === user.name && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 'auto', color: user.color }}>
                  <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Hook to fetch project members (for notes sharing — restricted to current project)
export function useUsers() {
  const [users, setUsers] = useState<AppUser[]>([])
  useEffect(() => {
    fetch('/api/project-members').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setUsers(data)
    }).catch(() => {})
  }, [])
  return users
}
