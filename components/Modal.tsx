'use client'

import { useEffect } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: number
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 520 }: Props) {
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,4,12,0.75)', backdropFilter: 'blur(10px)' }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth,
          background: 'var(--bg-1)', border: '1px solid var(--border-m)',
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          animation: 'fadeIn 0.15s ease',
          maxHeight: '90dvh', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-s)', flexShrink: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--t0)' }}>{title}</h2>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border-s)', color: 'var(--t1)', cursor: 'pointer', fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        {/* Body */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// Shared form field primitives
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {children}
    </div>
  )
}

const base: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'var(--bg-2)', border: '1px solid var(--border-s)',
  borderRadius: 8, color: 'var(--t0)', fontSize: 13, outline: 'none',
  transition: 'border-color 0.15s',
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...base, ...props.style }}
      onFocus={e => { e.target.style.borderColor = 'var(--accent)'; props.onFocus?.(e) }}
      onBlur={e => { e.target.style.borderColor = 'var(--border-s)'; props.onBlur?.(e) }}
    />
  )
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={props.rows ?? 3}
      style={{ ...base, resize: 'vertical', lineHeight: 1.6, ...props.style }}
      onFocus={e => { e.target.style.borderColor = 'var(--accent)'; props.onFocus?.(e) }}
      onBlur={e => { e.target.style.borderColor = 'var(--border-s)'; props.onBlur?.(e) }}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{ ...base, appearance: 'none', cursor: 'pointer', ...props.style }}
    />
  )
}

export function FormActions({ onCancel, loading, label = 'Enregistrer' }: { onCancel: () => void; loading: boolean; label?: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-s)' }}>
      <button type="button" onClick={onCancel} className="btn btn-ghost">Annuler</button>
      <button type="submit" disabled={loading} className="btn btn-primary" style={{ opacity: loading ? 0.6 : 1 }}>
        {loading ? '…' : label}
      </button>
    </div>
  )
}
