import { useCallback, useSyncExternalStore } from 'react'
import { makeStore } from './localStore'

export type ProviderId = 'google' | 'outlook' | 'apple'
export type SyncDirection = 'two_way' | 'import' | 'export'

export interface Connection {
  connected: boolean
  account?: string
  lastSyncedAt?: string
  direction: SyncDirection
}

export const PROVIDERS: { id: ProviderId; name: string; blurb: string; icon: string; color: string }[] = [
  { id: 'google', name: 'Google Calendar', blurb: 'Two-way sync with your Google account', icon: '🗓️', color: '#4FD1FF' },
  { id: 'outlook', name: 'Outlook / Microsoft 365', blurb: 'Sync work events via Microsoft Graph', icon: '📅', color: '#7C6FFF' },
  { id: 'apple', name: 'Apple iCloud Calendar', blurb: 'Sync via CalDAV with your Apple ID', icon: '🍎', color: '#FF6FB0' },
]

export const DIRECTIONS: { value: SyncDirection; label: string }[] = [
  { value: 'two_way', label: 'Two-way sync' },
  { value: 'import', label: 'Import only' },
  { value: 'export', label: 'Export only' },
]

type State = Record<ProviderId, Connection>

const seed: State = {
  google: { connected: false, direction: 'two_way' },
  outlook: { connected: false, direction: 'two_way' },
  apple: { connected: false, direction: 'import' },
}

const store = makeStore<State>('remindly.calendarSync.v1', seed)

export function formatSynced(iso?: string): string {
  if (!iso) return 'Never synced'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'Synced just now'
  if (mins < 60) return `Synced ${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `Synced ${hrs}h ago`
  return `Synced ${Math.round(hrs / 24)}d ago`
}

export function useCalendarSync() {
  const state = useSyncExternalStore(store.subscribe, store.get, store.get)

  const connect = useCallback((id: ProviderId, account: string) => {
    const cur = store.get()
    store.set({ ...cur, [id]: { ...cur[id], connected: true, account, lastSyncedAt: new Date().toISOString() } })
  }, [])

  const disconnect = useCallback((id: ProviderId) => {
    const cur = store.get()
    store.set({ ...cur, [id]: { ...cur[id], connected: false, account: undefined, lastSyncedAt: undefined } })
  }, [])

  const setDirection = useCallback((id: ProviderId, direction: SyncDirection) => {
    const cur = store.get()
    store.set({ ...cur, [id]: { ...cur[id], direction } })
  }, [])

  const syncNow = useCallback((id: ProviderId) => {
    const cur = store.get()
    store.set({ ...cur, [id]: { ...cur[id], lastSyncedAt: new Date().toISOString() } })
  }, [])

  const connectedCount = (Object.keys(state) as ProviderId[]).filter(k => state[k].connected).length
  return { state, connect, disconnect, setDirection, syncNow, connectedCount }
}
