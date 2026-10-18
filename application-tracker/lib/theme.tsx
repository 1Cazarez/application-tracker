'use client'

import { createContext, useContext, useEffect, useMemo } from 'react'
import {
  ACCENT_KEY, DARK_QUERY, THEME_MODE_KEY, Accent, ThemeMode, isAccent, isThemeMode,
} from './theme-config'
import { createStoredSetting, useStoredSetting } from './storedSetting'

type ThemeContextValue = {
  mode: ThemeMode
  accent: Accent
  setMode: (mode: ThemeMode) => void
  setAccent: (accent: Accent) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const storedMode = createStoredSetting<ThemeMode>(THEME_MODE_KEY, isThemeMode, 'system')
const storedAccent = createStoredSetting<Accent>(ACCENT_KEY, isAccent, 'indigo')

function applyMode(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'system' && window.matchMedia(DARK_QUERY).matches)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
}

function setMode(next: ThemeMode) {
  applyMode(next)
  storedMode.set(next)
}

function setAccent(next: Accent) {
  document.documentElement.setAttribute('data-accent', next)
  storedAccent.set(next)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The init script in <head> has already painted the stored theme; these
  // values only drive the controls on the settings page.
  const mode = useStoredSetting(storedMode)
  const accent = useStoredSetting(storedAccent)

  // In 'system' mode, follow the OS as it flips between light and dark.
  useEffect(() => {
    if (mode !== 'system') return
    const media = window.matchMedia(DARK_QUERY)
    const onChange = () => applyMode('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [mode])

  const value = useMemo(() => ({ mode, accent, setMode, setAccent }), [mode, accent])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside a ThemeProvider')
  return context
}
