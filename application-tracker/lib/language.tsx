'use client'

import { createContext, useContext, useEffect, useMemo } from 'react'
import { Language, TranslationKey, isLanguage, translate } from './i18n'
import { createStoredSetting, useStoredSetting } from './storedSetting'

const storedLanguage = createStoredSetting<Language>('app-language', isLanguage, 'en')

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useStoredSetting(storedLanguage)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo(
    () => ({
      language,
      setLanguage: storedLanguage.set,
      t: (key: TranslationKey, params?: Record<string, string | number>) =>
        translate(language, key, params),
    }),
    [language]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used inside a LanguageProvider')
  return context
}
