'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Modal, Field, Input, Textarea, Select, FormActions } from './Modal'
import type { Idea } from '@/lib/types'

const STATUSES    = ['Brute', 'À explorer', 'Validée', 'Rejetée']
const CATEGORIES  = ['', 'Produit', 'Marketing', 'Prospection', 'Ops']
const EFFORTS     = ['', 'Faible', 'Moyen', 'Élevé']

const empty = (): Partial<Idea> => ({ title: '', description: '', status: 'Brute', category: '', effort: '', votes: 0 })

interface Props {
  isOpen: boolean
  onClose: () => void
  idea?: Idea | null
  onSaved: () => void
}

export function IdeaModal({ isOpen, onClose, idea, onSaved }: Props) {
  const { data: session } = useSession()
  const [form, setForm] = useState<Partial<Idea>>(empty())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm(idea ? { ...idea } : empty())
  }, [idea, isOpen])

  const set = (k: keyof Idea) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title?.trim()) return
    setLoading(true)
    const body = { ...form, modifiedBy: session?.user?.name ?? '' }
    try {
      if (idea) {
        await fetch(`/api/ideas/${idea.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await fetch('/api/ideas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      onSaved()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={idea ? "Modifier l'idée" : 'Nouvelle idée'}>
      <form onSubmit={handleSubmit}>
        <Field label="Titre *">
          <Input value={form.title ?? ''} onChange={set('title')} placeholder="Votre idée en une ligne" required autoFocus />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Statut">
            <Select value={form.status ?? 'Brute'} onChange={set('status')}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Effort">
            <Select value={form.effort ?? ''} onChange={set('effort')}>
              {EFFORTS.map(e => <option key={e} value={e}>{e || '— aucun —'}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Catégorie">
          <Select value={form.category ?? ''} onChange={set('category')}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c || '— aucune —'}</option>)}
          </Select>
        </Field>
        <Field label="Description">
          <Textarea value={form.description ?? ''} onChange={set('description')} placeholder="Contexte, bénéfices attendus…" rows={4} />
        </Field>
        <FormActions onCancel={onClose} loading={loading} label={idea ? 'Mettre à jour' : 'Créer'} />
      </form>
    </Modal>
  )
}
