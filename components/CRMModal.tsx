'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Modal, Field, Input, Textarea, Select, FormActions } from './Modal'
import { UserPicker, useUsers } from './UserPicker'
import type { CRMEntry } from '@/lib/types'

const STATUSES = ['À contacter', 'Contacté', 'RDV pris', 'Offre envoyée', 'Client', 'Refus']
const CANAUX   = ['', 'Email', 'Téléphone', 'Salon', 'Terrain', 'Recommandation']
const TYPES    = ['', 'Épicerie fine', 'Caviste', 'Traiteur', 'Concept store', 'Autre']
const PRIORITIES = ['', 'Haute', 'Moyenne', 'Basse']

const empty = (): Partial<CRMEntry> => ({
  enseigne: '', contact: '', email: '', phone: '', ville: '',
  status: 'À contacter', canal: '', type: '', priority: '',
  notes: '', nextFollowup: '', lastContact: '', assignedTo: '',
})

interface Props {
  isOpen: boolean
  onClose: () => void
  entry?: CRMEntry | null
  defaultStatus?: CRMEntry['status']
  onSaved: () => void
}

export function CRMModal({ isOpen, onClose, entry, defaultStatus, onSaved }: Props) {
  const { user: session } = useAuth()
  const [form, setForm] = useState<Partial<CRMEntry>>(empty())
  const [loading, setLoading] = useState(false)
  const users = useUsers()

  useEffect(() => {
    setForm(entry ? { ...entry } : { ...empty(), status: defaultStatus ?? 'À contacter' })
  }, [entry, defaultStatus, isOpen])

  const set = (k: keyof CRMEntry) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.enseigne?.trim()) return
    setLoading(true)
    const body = { ...form, modifiedBy: session?.name ?? '' }
    try {
      if (entry) {
        await fetch(`/api/crm/${entry.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await fetch('/api/crm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      onSaved()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={entry ? 'Modifier le prospect' : 'Nouveau prospect'} maxWidth={560}>
      <form onSubmit={handleSubmit}>
        <Field label="Enseigne *">
          <Input value={form.enseigne ?? ''} onChange={set('enseigne')} placeholder="Nom de l'enseigne" required autoFocus />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Statut pipeline">
            <Select value={form.status ?? 'À contacter'} onChange={set('status')}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Priorité">
            <Select value={form.priority ?? ''} onChange={set('priority')}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p || '— aucune —'}</option>)}
            </Select>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Type">
            <Select value={form.type ?? ''} onChange={set('type')}>
              {TYPES.map(t => <option key={t} value={t}>{t || '— aucun —'}</option>)}
            </Select>
          </Field>
          <Field label="Canal">
            <Select value={form.canal ?? ''} onChange={set('canal')}>
              {CANAUX.map(c => <option key={c} value={c}>{c || '— aucun —'}</option>)}
            </Select>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Contact">
            <Input value={form.contact ?? ''} onChange={set('contact')} placeholder="Prénom Nom" />
          </Field>
          <Field label="Ville">
            <Input value={form.ville ?? ''} onChange={set('ville')} placeholder="Lyon" />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Email">
            <Input type="email" value={form.email ?? ''} onChange={set('email')} placeholder="contact@enseigne.fr" />
          </Field>
          <Field label="Téléphone">
            <Input type="tel" value={form.phone ?? ''} onChange={set('phone')} placeholder="06 12 34 56 78" />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Dernier contact">
            <Input type="date" value={form.lastContact ?? ''} onChange={set('lastContact')} />
          </Field>
          <Field label="Prochain suivi">
            <Input type="date" value={form.nextFollowup ?? ''} onChange={set('nextFollowup')} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={form.notes ?? ''} onChange={set('notes')} placeholder="Notes libres…" />
        </Field>
        <Field label="Assigné à">
          <UserPicker
            value={form.assignedTo ?? ''}
            onChange={name => setForm(p => ({ ...p, assignedTo: name }))}
            users={users}
            placeholder="Personne"
          />
        </Field>
        <FormActions onCancel={onClose} loading={loading} label={entry ? 'Mettre à jour' : 'Créer'} />
      </form>
    </Modal>
  )
}
