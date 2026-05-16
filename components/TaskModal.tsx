'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Modal, Field, Input, Textarea, Select, FormActions } from './Modal'
import { UserPicker, useUsers } from './UserPicker'
import { useLanguage } from '@/context/LanguageContext'
import type { Task } from '@/lib/types'

const STATUSES = ['Backlog', 'À faire', 'En cours', 'Review', 'Done']
const PRIORITIES = ['', 'P0', 'P1', 'P2']
const MODULES = ['', 'Produit', 'Marketing', 'Prospection', 'Ops']

const empty = (): Partial<Task> => ({ title: '', status: 'Backlog', priority: '', module: '', description: '', dateStart: '', dateEnd: '', assignedTo: '' })

interface Props {
  isOpen: boolean
  onClose: () => void
  task?: Task | null
  defaultStatus?: Task['status']
  onSaved: () => void
}

export function TaskModal({ isOpen, onClose, task, defaultStatus, onSaved }: Props) {
  const { user: session } = useAuth()
  const { t } = useLanguage()
  const [form, setForm] = useState<Partial<Task>>(empty())
  const [loading, setLoading] = useState(false)
  const users = useUsers()

  useEffect(() => {
    setForm(task ? { ...task } : { ...empty(), status: defaultStatus ?? 'Backlog' })
  }, [task, defaultStatus, isOpen])

  const set = (k: keyof Task) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title?.trim()) return
    setLoading(true)
    const body = { ...form, modifiedBy: session?.name ?? '' }
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
    <Modal isOpen={isOpen} onClose={onClose} title={task ? t('editTask') : t('newTask')}>
      <form onSubmit={handleSubmit}>
        <Field label={`${t('taskTitle')} *`}>
          <Input value={form.title ?? ''} onChange={set('title')} placeholder={t('taskTitlePlaceholder')} required autoFocus />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={t('status')}>
            <Select value={form.status ?? 'Backlog'} onChange={set('status')}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label={t('taskPriority')}>
            <Select value={form.priority ?? ''} onChange={set('priority')}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p || t('noneOption')}</option>)}
            </Select>
          </Field>
        </div>
        <Field label={t('taskModule')}>
          <Select value={form.module ?? ''} onChange={set('module')}>
            {MODULES.map(m => <option key={m} value={m}>{m || t('noneOption')}</option>)}
          </Select>
        </Field>
        <Field label={t('taskAssignee')}>
          <UserPicker
            value={form.assignedTo ?? ''}
            onChange={name => setForm(p => ({ ...p, assignedTo: name }))}
            users={users}
            placeholder={t('nobody')}
          />
        </Field>
        <Field label={t('taskDescription')}>
          <Textarea value={form.description ?? ''} onChange={set('description')} placeholder={t('taskDescriptionPlaceholder')} />
        </Field>
        {(() => {
          const dateError = form.dateEnd && form.dateStart && form.dateEnd < form.dateStart
          return (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label={t('taskDateStart')}>
                  <Input type="date" value={form.dateStart ?? ''} onChange={set('dateStart')} />
                </Field>
                <Field label={t('taskDateEnd')}>
                  <Input type="date" value={form.dateEnd ?? ''} onChange={set('dateEnd')}
                    style={{ borderColor: dateError ? 'var(--red)' : undefined }} />
                </Field>
              </div>
              {dateError && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: -8, marginBottom: 10 }}>{t('dateEndError')}</p>}
              <FormActions onCancel={onClose} loading={loading || !!dateError} label={task ? t('update') : t('create')} />
            </>
          )
        })()}
      </form>
    </Modal>
  )
}
