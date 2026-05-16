'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Modal, Field, Input, Textarea, Select, FormActions } from './Modal'
import { UserPicker, useUsers } from './UserPicker'
import { useLanguage } from '@/context/LanguageContext'
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
  const { t } = useLanguage()
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
    <Modal isOpen={isOpen} onClose={onClose} title={entry ? t('editProspect') : t('newProspect')} maxWidth={560}>
      <form onSubmit={handleSubmit}>
        <Field label={`${t('crmEnseigneLabel')} *`}>
          <Input value={form.enseigne ?? ''} onChange={set('enseigne')} placeholder={t('crmEnseignePlaceholder')} required autoFocus />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={t('crmPipelineStatus')}>
            <Select value={form.status ?? 'À contacter'} onChange={set('status')}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label={t('priority')}>
            <Select value={form.priority ?? ''} onChange={set('priority')}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p || t('noneOption')}</option>)}
            </Select>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={t('type')}>
            <Select value={form.type ?? ''} onChange={set('type')}>
              {TYPES.map(tp => <option key={tp} value={tp}>{tp || t('noneOption')}</option>)}
            </Select>
          </Field>
          <Field label={t('channel')}>
            <Select value={form.canal ?? ''} onChange={set('canal')}>
              {CANAUX.map(c => <option key={c} value={c}>{c || t('noneOption')}</option>)}
            </Select>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={t('contactPerson')}>
            <Input value={form.contact ?? ''} onChange={set('contact')} placeholder={t('namePlaceholder')} />
          </Field>
          <Field label={t('crmVille')}>
            <Input value={form.ville ?? ''} onChange={set('ville')} placeholder="Lyon" />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={t('email')}>
            <Input type="email" value={form.email ?? ''} onChange={set('email')} placeholder="contact@enseigne.fr" />
          </Field>
          <Field label={t('crmPhone')}>
            <Input type="tel" value={form.phone ?? ''} onChange={set('phone')} placeholder="06 12 34 56 78" />
          </Field>
        </div>
        {(() => {
          const dateError = form.nextFollowup && form.lastContact && form.nextFollowup < form.lastContact
          return (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label={t('crmLastContact')}>
                  <Input type="date" value={form.lastContact ?? ''} onChange={set('lastContact')} />
                </Field>
                <Field label={t('nextFollowUp')}>
                  <Input type="date" value={form.nextFollowup ?? ''} onChange={set('nextFollowup')}
                    style={{ borderColor: dateError ? 'var(--red)' : undefined }} />
                </Field>
              </div>
              {dateError && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: -8, marginBottom: 10 }}>{t('crmFollowupError')}</p>}
            </>
          )
        })()}
        <Field label={t('crmNotes')}>
          <Textarea value={form.notes ?? ''} onChange={set('notes')} placeholder={t('crmNotesPlaceholder')} />
        </Field>
        <Field label={t('crmAssignee')}>
          <UserPicker
            value={form.assignedTo ?? ''}
            onChange={name => setForm(p => ({ ...p, assignedTo: name }))}
            users={users}
            placeholder={t('nobody')}
          />
        </Field>
        <FormActions onCancel={onClose} loading={loading} label={entry ? t('update') : t('create')} />
      </form>
    </Modal>
  )
}
