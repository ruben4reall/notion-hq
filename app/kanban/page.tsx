'use client'

import dynamic from 'next/dynamic'

const KanbanBoard = dynamic(() => import('@/components/KanbanBoard'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ minWidth: 256, flex: '0 0 256px' }}>
          <div className="skeleton" style={{ height: 16, width: 80, borderRadius: 6, marginBottom: 12 }} />
          {[1,2,3].map(j => (
            <div key={j} className="skeleton" style={{ height: 80, borderRadius: 10, marginBottom: 8 }} />
          ))}
        </div>
      ))}
    </div>
  ),
})

export default function KanbanPage() {
  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Kanban</h1>
        <p className="page-subtitle">Glissez les cartes pour changer leur statut</p>
      </div>
      <KanbanBoard />
    </div>
  )
}
