'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Modal, Field, Input, Textarea, Select, FormActions } from './Modal'
import { UserPicker, useUsers } from './UserPicker'
import { useLanguage } from '@/context/LanguageContext'
import type { Idea } from '@/lib/types'

const STATUSES: { value: string; key: string }[] = [
  { value: 'Brute',      key: 'ideaRaw' },
  { value: 'À explorer', key: 'ideaExplore' },
  { value: 'Validée',    key: 'ideaValidated' },
  { value: 'Rejetée',    key: 'ideaRejected' },
]
const CATEGORIES: { value: string; key: string }[] = [
  { value: '',            key: '' },
  { value: 'Produit',     key: 'moduleProduct' },
  { value: 'Marketing',   key: 'moduleMarketing' },
  { value: 'Prospection', key: 'moduleSales' },
  { value: 'Ops',         key: 'moduleOps' },
]
const EFFORTS: { value: string; key: string }[] = [
  { value: '',       key: '' },
  { value: 'Faible', key: 'effortLow' },
  { value: 'Moyen',  key: 'effortMedium' },
  { value: 'Élevé',  key: 'effortHigh' },
]

const empty = (): Partial<Idea> => ({ title: '', description: '', status: 'Brute', category: '', effort: '', votes: 0, assignedTo: '' })

interface Props {
  isOpen: boolean
  onClose: () => void
  idea?: Idea | null
  onSaved: () => void
}

export function IdeaModal({ isOpen, onClose, idea, onSaved }: Props) {
  const { user: session } = useAuth()
  const { t } = useLanguage()
  const [form, setForm] = useState<Partial<Idea>>(empty())
  const [loading, setLoading] = useState(false)
  const users = useUsers()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(idea ? { ...idea } : empty())
  }, [idea, isOpen])

  const set = (k: keyof Idea) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title?.trim()) return
    setLoading(true)
    const body = { ...form, modifiedBy: session?.name ?? '' }
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
    <Modal isOpen={isOpen} onClose={onClose} title={idea ? t('editIdea') : t('newIdea')}>
      <form onSubmit={handleSubmit}>
        <Field label={`${t('ideaTitle')} *`}>
          <Input value={form.title ?? ''} onChange={set('title')} placeholder={t('ideaTitlePlaceholder')} required autoFocus />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={t('status')}>
            <Select value={form.status ?? 'Brute'} onChange={set('status')}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{t(s.key)}</option>)}
            </Select>
          </Field>
          <Field label={t('effort')}>
            <Select value={form.effort ?? ''} onChange={set('effort')}>
              {EFFORTS.map(e => <option key={e.value} value={e.value}>{e.value ? t(e.key) : t('noneOption')}</option>)}
            </Select>
          </Field>
        </div>
        <Field label={t('category')}>
          <Select value={form.category ?? ''} onChange={set('category')}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.value ? t(c.key) : t('noneOption')}</option>)}
          </Select>
        </Field>
        <Field label={t('ideaDescription')}>
          <Textarea value={form.description ?? ''} onChange={set('description')} placeholder={t('ideaDescriptionPlaceholder')} rows={4} />
        </Field>
        <Field label={t('taskAssignee')}>
          <UserPicker
            value={form.assignedTo ?? ''}
            onChange={name => setForm(p => ({ ...p, assignedTo: name }))}
            users={users}
            placeholder={t('nobody')}
          />
        </Field>
        <FormActions onCancel={onClose} loading={loading} label={idea ? t('update') : t('create')} />
      </form>
    </Modal>
  )
}
