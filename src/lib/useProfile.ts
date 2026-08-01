import { useCallback, useSyncExternalStore } from 'react'

export interface ProfileFields {
  displayName: string
  timezone: string
  location: string
  role: string
  /** Extended details */
  bio: string
  phone: string
  jobTitle: string
  company: string
  website: string
  birthday: string
  language: string
  weekStart: 'monday' | 'sunday'
}

const KEY = 'remindly.profile.v1'

const defaults: ProfileFields = {
  displayName: '',
  timezone: 'Pacific/Auckland',
  location: 'Auckland, NZ',
  role: 'User',
  bio: '',
  phone: '',
  jobTitle: '',
  company: '',
  website: '',
  birthday: '',
  language: 'English (NZ)',
  weekStart: 'monday',
}

export const LANGUAGES = ['English (NZ)', 'English (AU)', 'English (UK)', 'English (US)', 'Te Reo Māori', 'Hindi', 'Odia', 'Mandarin', 'Samoan']

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
