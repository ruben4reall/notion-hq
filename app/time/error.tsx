'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="page-container" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:16 }}>
      <div style={{ fontSize:36 }}>⚠️</div>
      <p style={{ fontSize:16, fontWeight:700, color:'var(--t0)' }}>Erreur dans Time Tracker</p>
      <p style={{ fontSize:13, color:'var(--t2)', textAlign:'center', maxWidth:320 }}>{error.message || "Une erreur inattendue s'est produite."}</p>
      <button onClick={reset} style={{ padding:'8px 20px', borderRadius:8, background:'var(--accent)', color:'white', border:'none', fontSize:13, fontWeight:600, cursor:'pointer' }}>
        Réessayer
      </button>
    </div>
  )
}
