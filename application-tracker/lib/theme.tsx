'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  ACCENT_KEY, DARK_QUERY, THEME_MODE_KEY, Accent, ThemeMode, isAccent, isThemeMode,
} from './theme-config'

type ThemeContextValue = {
  mode: ThemeMode
  accent: Accent
  setMode: (mode: ThemeMode) => void
  setAccent: (accent: Accent) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyMode(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'system' && window.matchMedia(DARK_QUERY).matches)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private browsing or blocked storage: the choice just won't persist.
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start on the defaults so the server and client render the same markup. The
  // init script in <head> has already painted the stored theme; this state only
  // needs to catch up so the settings controls show the right selection.
  const [mode, setModeState] = useState<ThemeMode>('system')
  const [accent, setAccentState] = useState<Accent>('indigo')

  useEffect(() => {
    try {
      const storedMode = localStorage.getItem(THEME_MODE_KEY)
      const storedAccent = localStorage.getItem(ACCENT_KEY)
      if (isThemeMode(storedMode)) setModeState(storedMode)
      if (isAccent(storedAccent)) setAccentState(storedAccent)
    } catch {
      // Blocked storage: stay on the defaults.
    }
  }, [])

  // In 'system' mode, follow the OS as it flips between light and dark.
  useEffect(() => {
    if (mode !== 'system') return
    const media = window.matchMedia(DARK_QUERY)
    const onChange = () => applyMode('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [mode])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    applyMode(next)
    remember(THEME_MODE_KEY, next)
  }, [])

  const setAccent = useCallback((next: Accent) => {
    setAccentState(next)
    document.documentElement.setAttribute('data-accent', next)
    remember(ACCENT_KEY, next)
  }, [])

  const value = useMemo(() => ({ mode, accent, setMode, setAccent }), [mode, accent, setMode, setAccent])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside a ThemeProvider')
  return context
}
