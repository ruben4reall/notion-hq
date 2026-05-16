'use client'

import { useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLanguage()
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="page-container" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:16 }}>
      <div style={{ fontSize:36 }}>⚠️</div>
      <p style={{ fontSize:16, fontWeight:700, color:'var(--t0)' }}>{t('errorIn')} {t('roadmap')}</p>
      <p style={{ fontSize:13, color:'var(--t2)', textAlign:'center', maxWidth:320 }}>{error.message || t('unexpectedError')}</p>
      <button onClick={reset} style={{ padding:'8px 20px', borderRadius:8, background:'var(--accent)', color:'white', border:'none', fontSize:13, fontWeight:600, cursor:'pointer' }}>
        {t('retry')}
      </button>
    </div>
  )
}
