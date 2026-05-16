'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { t as tFn, type Lang } from '@/lib/i18n'

interface LanguageCtx {
  lang: Lang
  setLang: (lang: Lang) => Promise<void>
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageCtx>({
  lang: 'fr',
  setLang: async () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => { if (d.language) setLangState(d.language as Lang) })
      .catch(() => {})
  }, [])

  const setLang = useCallback(async (newLang: Lang) => {
    setLangState(newLang)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'language', value: newLang }),
    }).catch(() => {})
  }, [])

  const translate = useCallback(
    (key: string, vars?: Record<string, string | number>) => tFn(lang, key, vars),
    [lang]
  )

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translate }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
