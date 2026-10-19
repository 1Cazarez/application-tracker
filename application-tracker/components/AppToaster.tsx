'use client'

import { Toaster } from 'sonner'
import { useTheme } from '@/lib/theme'

// Sonner reads its colors from these variables; pointing them at the theme
// tokens keeps toasts in step with the light/dark mode and accent.
const toastColors = {
  '--normal-bg': 'var(--primary)',
  '--normal-text': 'var(--on-primary)',
  '--normal-border': 'var(--primary)',
  '--border-radius': 'var(--radius-lg)',
} as React.CSSProperties

export function AppToaster() {
  const { mode } = useTheme()
  return <Toaster position="bottom-center" theme={mode} style={toastColors} />
}
