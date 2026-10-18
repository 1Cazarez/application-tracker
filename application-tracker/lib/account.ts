'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { useLanguage } from './language'
import { isLanguage } from './i18n'
import type { Status } from './jobFields'

export type UserSettings = {
  gemini_api_key: string | null
  reminders_enabled: boolean
  reminder_days: number
  default_status: Status
  language: string
}

export type Account = {
  user: User
  // Null until the user first saves their settings.
  settings: UserSettings | null
}

async function loadAccount(): Promise<Account | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: settings } = await supabase
    .from('user_settings')
    .select('gemini_api_key, reminders_enabled, reminder_days, default_status, language')
    .eq('user_id', user.id)
    .maybeSingle<UserSettings>()

  return { user, settings }
}

/**
 * The signed-in user and their saved settings, or null while loading.
 * Redirects to /login when there's no session. The account's saved language
 * wins over whatever this device had stored, so it carries across devices.
 */
export function useAccount() {
  const router = useRouter()
  const { setLanguage } = useLanguage()
  const [account, setAccount] = useState<Account | null>(null)

  useEffect(() => {
    let cancelled = false
    loadAccount().then(result => {
      if (cancelled) return
      if (!result) {
        router.push('/login')
        return
      }
      if (isLanguage(result.settings?.language)) setLanguage(result.settings.language)
      setAccount(result)
    })
    return () => {
      cancelled = true
    }
  }, [router, setLanguage])

  return account
}
