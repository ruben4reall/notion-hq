'use client'

import dynamic from 'next/dynamic'

const CRMPipeline = dynamic(() => import('@/components/CRMPipeline'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
      {[1,2,3,4,5,6].map(i => (
        <div key={i} style={{ minWidth: 230, flex: '0 0 230px' }}>
          <div className="skeleton" style={{ height: 16, width: 100, borderRadius: 6, marginBottom: 12 }} />
          {[1,2].map(j => (
            <div key={j} className="skeleton" style={{ height: 90, borderRadius: 10, marginBottom: 8 }} />
          ))}
        </div>
      ))}
    </div>
  ),
})

export default function CRMPage() {
  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Prospection CRM</h1>
        <p className="page-subtitle">Pipeline commercial — glissez pour faire progresser</p>
      </div>
      <CRMPipeline />
    </div>
  )
}
