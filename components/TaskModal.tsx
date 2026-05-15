'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Modal, Field, Input, Textarea, Select, FormActions } from './Modal'
import type { Task } from '@/lib/types'

const STATUSES = ['Backlog', 'À faire', 'En cours', 'Review', 'Done']
const PRIORITIES = ['', 'P0', 'P1', 'P2']
const MODULES = ['', 'Produit', 'Marketing', 'Prospection', 'Ops']

const empty = (): Partial<Task> => ({ title: '', status: 'Backlog', priority: '', module: '', description: '', dateStart: '', dateEnd: '' })

interface Props {
  isOpen: boolean
  onClose: () => void
  task?: Task | null
  defaultStatus?: Task['status']
  onSaved: () => void
}

export function TaskModal({ isOpen, onClose, task, defaultStatus, onSaved }: Props) {
  const { data: session } = useSession()
  const [form, setForm] = useState<Partial<Task>>(empty())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm(task ? { ...task } : { ...empty(), status: defaultStatus ?? 'Backlog' })
  }, [task, defaultStatus, isOpen])

  const set = (k: keyof Task) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title?.trim()) return
    setLoading(true)
    const body = { ...form, modifiedBy: session?.user?.name ?? '' }
    try {
      if (task) {
        await fetch(`/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      onSaved()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Modifier la tâche' : 'Nouvelle tâche'}>
      <form onSubmit={handleSubmit}>
        <Field label="Titre *">
          <Input value={form.title ?? ''} onChange={set('title')} placeholder="Nom de la tâche" required autoFocus />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Statut">
            <Select value={form.status ?? 'Backlog'} onChange={set('status')}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Priorité">
            <Select value={form.priority ?? ''} onChange={set('priority')}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p || '— aucune —'}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Module">
          <Select value={form.module ?? ''} onChange={set('module')}>
            {MODULES.map(m => <option key={m} value={m}>{m || '— aucun —'}</option>)}
          </Select>
        </Field>
        <Field label="Description">
          <Textarea value={form.description ?? ''} onChange={set('description')} placeholder="Détails optionnels…" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Date de début">
            <Input type="date" value={form.dateStart ?? ''} onChange={set('dateStart')} />
          </Field>
          <Field label="Date de fin">
            <Input type="date" value={form.dateEnd ?? ''} onChange={set('dateEnd')} />
          </Field>
        </div>
        <FormActions onCancel={onClose} loading={loading} label={task ? 'Mettre à jour' : 'Créer'} />
      </form>
    </Modal>
  )
}
