'use client'

import { usePathname } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'

const PUBLIC = ['/auth', '/login', '/org']

export function Footer() {
  const path = usePathname()
  const { t } = useLanguage()

  if (PUBLIC.some(p => path.startsWith(p))) return null

  return (
    <footer style={{
      textAlign: 'center',
      padding: '16px 20px',
      paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
      fontSize: 12,
      color: 'var(--t2)',
      borderTop: '1px solid var(--border-s)',
      marginTop: 8,
    }}>
      💪 {t('footerText')}
    </footer>
  )
}
