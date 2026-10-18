'use client'

import { useSyncExternalStore } from 'react'

export type StoredSetting<T extends string> = {
  get: () => T
  set: (next: T) => void
  subscribe: (listener: () => void) => () => void
  fallback: T
}

/**
 * A device-level preference kept in localStorage. The value also lives in
 * memory, so changing it still works when storage is blocked; it just won't
 * persist.
 */
export function createStoredSetting<T extends string>(
  key: string,
  isValid: (value: unknown) => value is T,
  fallback: T
): StoredSetting<T> {
  let current: T | null = null
  const listeners = new Set<() => void>()

  return {
    fallback,
    get() {
      if (current === null) {
        try {
          const stored = localStorage.getItem(key)
          current = isValid(stored) ? stored : fallback
        } catch {
          current = fallback
        }
      }
      return current
    },
    set(next) {
      current = next
      try {
        localStorage.setItem(key, next)
      } catch {
        // Private browsing or blocked storage: the choice just won't persist.
      }
      listeners.forEach(listener => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/**
 * Reads a stored setting. The server and the first client render both see the
 * fallback so their markup matches; the stored value takes over after
 * hydration.
 */
export function useStoredSetting<T extends string>(setting: StoredSetting<T>) {
  return useSyncExternalStore(setting.subscribe, setting.get, () => setting.fallback)
}
