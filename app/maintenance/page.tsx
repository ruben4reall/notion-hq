'use client'

import { useEffect, useState } from 'react'

export default function MaintenancePage() {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 600)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-0)', padding: 24, textAlign: 'center',
    }}>
      {/* Glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0,
      }}>
        <div style={{
          position: 'absolute', left: '50%', top: '40%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'var(--accent)', opacity: 0.08,
          filter: 'blur(120px)',
          transform: 'translate(-50%, -50%)',
          animation: 'pulse-dot 4s ease-in-out infinite',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 22,
          background: 'var(--accent)', margin: '0 auto 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 40px var(--accent-glow)',
          animation: 'floatIn 0.6s var(--ease-spring) both',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
            <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="1.8" strokeLinejoin="round" strokeOpacity="0.7"/>
            <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="1.8" strokeLinejoin="round" strokeOpacity="0.4"/>
          </svg>
        </div>

        <h1 style={{
          fontSize: 28, fontWeight: 800, color: 'var(--t0)',
          letterSpacing: '-0.03em', marginBottom: 12,
          animation: 'floatIn 0.6s var(--ease-spring) 0.1s both',
        }}>
          Maintenance en cours
        </h1>

        <p style={{
          fontSize: 16, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 40,
          animation: 'floatIn 0.6s var(--ease-spring) 0.2s both',
        }}>
          L'application est temporairement indisponible.<br />
          On revient très vite{dots}
        </p>

        {/* Progress bar */}
        <div style={{
          width: '100%', height: 3, background: 'var(--bg-3)',
          borderRadius: 99, overflow: 'hidden', marginBottom: 32,
          animation: 'floatIn 0.6s var(--ease-spring) 0.3s both',
        }}>
          <div style={{
            height: '100%', borderRadius: 99,
            background: 'var(--accent)',
            animation: 'maintenance-progress 2.4s ease-in-out infinite',
          }} />
        </div>

        <p style={{
          fontSize: 12, color: 'var(--t2)', opacity: 0.5,
          animation: 'floatIn 0.6s var(--ease-spring) 0.4s both',
        }}>
          Manager Dashboard
        </p>
      </div>

      <style>{`
        @keyframes maintenance-progress {
          0%   { width: 0%;   margin-left: 0%; }
          50%  { width: 60%;  margin-left: 20%; }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>
    </div>
  )
}
