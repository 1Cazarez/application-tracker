'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Language, TranslationKey, isLanguage, translate } from './i18n'

const STORAGE_KEY = 'app-language'

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always start on 'en' so the server and client render the same markup, then
  // switch once localStorage is readable.
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(stored)) {
      setLanguageState(stored)
      document.documentElement.lang = stored
    }
  }, [])

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    document.documentElement.lang = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Private browsing or blocked storage: the choice just won't persist.
    }
  }, [])

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: TranslationKey, params?: Record<string, string | number>) =>
        translate(language, key, params),
    }),
    [language, setLanguage]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used inside a LanguageProvider')
  return context
}
