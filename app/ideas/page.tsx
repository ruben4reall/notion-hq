'use client'

import dynamic from 'next/dynamic'
import { useLanguage } from '@/context/LanguageContext'

const IdeasView = dynamic(() => import('@/components/IdeasView'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="skeleton" style={{ height: 180, borderRadius: 12 }} />
      ))}
    </div>
  ),
})

export default function IdeasPage() {
  const { t } = useLanguage()
  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">{t('ideas')}</h1>
        <p className="page-subtitle">{t('ideasSubtitle')}</p>
      </div>
      <IdeasView />
    </div>
  )
}
