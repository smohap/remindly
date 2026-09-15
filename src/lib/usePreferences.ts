import { useCallback, useSyncExternalStore } from 'react'
import { makeStore } from './localStore'
import { supabase } from './supabase'
import { currentUserId } from './invoicesDb'

/**
 * Notification preferences — today just the quiet-hours window. Stored on
 * device and mirrored to `user_preferences` (0001) when signed in.
 */
export interface Preferences {
  quietEnabled: boolean
  quietStart: string // 'HH:MM'
  quietEnd: string // 'HH:MM'
}

export const DEFAULT_PREFERENCES: Preferences = { quietEnabled: true, quietStart: '22:00', quietEnd: '07:00' }

const store = makeStore<Preferences>('remindly.preferences.v1', DEFAULT_PREFERENCES)

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h % 24) * 60 + (m || 0)
}

/** Is `now` inside the quiet window? Handles windows that cross midnight. */
export function inQuietWindow(prefs: Preferences, now: Date = new Date()): boolean {
  if (!prefs.quietEnabled) return false
  const cur = now.getHours() * 60 + now.getMinutes()
  const start = toMinutes(prefs.quietStart)
  const end = toMinutes(prefs.quietEnd)
  if (start === end) return false
  return start < end ? cur >= start && cur < end : cur >= start || cur < end
}

export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return m ? `${hour}:${String(m).padStart(2, '0')} ${period}` : `${hour} ${period}`
}

let pushTimer: ReturnType<typeof setTimeout> | null = null
function schedulePush() {
  if (!supabase) return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(async () => {
    const uid = await currentUserId()
    if (!uid || !supabase) return
    const p = store.get()
    await supabase.from('user_preferences').upsert(
      { user_id: uid, quiet_hours_enabled: p.quietEnabled, quiet_start: p.quietStart, quiet_end: p.quietEnd, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  }, 600)
}

export async function hydratePreferences(uid: string) {
  if (!supabase) return
  const { data } = await supabase.from('user_preferences').select('quiet_hours_enabled, quiet_start, quiet_end').eq('user_id', uid).maybeSingle()
  if (!data) return
  store.set({
    quietEnabled: Boolean(data.quiet_hours_enabled),
    quietStart: String(data.quiet_start ?? '22:00').slice(0, 5),
    quietEnd: String(data.quiet_end ?? '07:00').slice(0, 5),
  })
}

/** Read without subscribing — for the notification loop. */
export const getPreferences = store.get

export function usePreferences() {
  const prefs = useSyncExternalStore(store.subscribe, store.get, store.get)
  const update = useCallback((patch: Partial<Preferences>) => {
    store.set({ ...store.get(), ...patch })
    schedulePush()
  }, [])
  return { prefs, update }
}
