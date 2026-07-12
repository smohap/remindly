import { useCallback, useSyncExternalStore } from 'react'

export interface ProfileFields {
  displayName: string
  timezone: string
  location: string
  role: string
}

const KEY = 'remindly.profile.v1'

const defaults: ProfileFields = {
  displayName: '',
  timezone: 'Pacific/Auckland',
  location: 'Auckland, NZ',
  role: 'User',
}

let fields: ProfileFields = load()
const listeners = new Set<() => void>()

function load(): ProfileFields {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<ProfileFields>) } : defaults
  } catch {
    return defaults
  }
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Editable profile fields, persisted locally. Name/email come from auth. */
export function useProfile() {
  const value = useSyncExternalStore(subscribe, () => fields, () => fields)

  const save = useCallback((next: Partial<ProfileFields>) => {
    fields = { ...fields, ...next }
    try {
      localStorage.setItem(KEY, JSON.stringify(fields))
    } catch {
      /* ignore */
    }
    listeners.forEach(l => l())
  }, [])

  return { profile: value, save }
}

export const TIMEZONES = [
  'Pacific/Auckland',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
]
