import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'

export type SyncState = 'local' | 'loading' | 'synced' | 'saving' | 'error'

/**
 * A localStorage-backed collection that also mirrors to Postgres when a user is
 * signed in against a configured Supabase project.
 *
 * Local-first by design: every mutation applies to the on-device copy
 * immediately (so the UI never waits on the network), then the whole collection
 * is pushed in the background. That keeps the app fully usable offline and in
 * demo mode, at the cost of last-write-wins if the same account edits the same
 * row on two devices at once.
 *
 * Only suitable for OWNER-SCOPED data. Anything multi-writer (group chat) must
 * append rows instead — pushing a whole local copy would clobber other people's.
 */
export function makeSyncedStore<T extends { id: string }>(opts: {
  key: string
  seed: T[]
  table: string
  /** Domain object -> DB row (id and the owner column are added for you). */
  toRow: (item: T) => Record<string, unknown>
  /** DB row -> domain object. */
  fromRow: (row: Record<string, unknown>) => T
  /** Column holding the owner; defaults to owner_id. */
  ownerColumn?: string
  orderBy?: { column: string; ascending?: boolean }
}) {
  const ownerCol = opts.ownerColumn ?? 'owner_id'
  let items: T[] = load()
  let ownerId: string | null = null
  let state: SyncState = 'local'
  let lastError: string | null = null
  let pushTimer: ReturnType<typeof setTimeout> | null = null
  let hydrated = false

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  function newId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(16).padStart(8, '0').slice(0, 8)}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`
  }

  /**
   * Seeded and legacy rows use short ids like "l1", but these tables key on
   * uuid — re-key anything that isn't a UUID before it reaches Postgres.
   */
  function ensureUuids() {
    let changed = false
    items = items.map(i => {
      if (UUID_RE.test(i.id)) return i
      changed = true
      return { ...i, id: newId() }
    })
    if (changed) {
      persistLocal()
      listeners.forEach(l => l())
    }
  }

  const listeners = new Set<() => void>()
  const stateListeners = new Set<() => void>()

  function load(): T[] {
    try {
      const raw = localStorage.getItem(opts.key)
      return raw ? (JSON.parse(raw) as T[]) : opts.seed
    } catch {
      return opts.seed
    }
  }

  function persistLocal() {
    try {
      localStorage.setItem(opts.key, JSON.stringify(items))
    } catch {
      /* quota / private mode */
    }
  }

  function setState(next: SyncState) {
    state = next
    stateListeners.forEach(l => l())
  }

  /** Push the full collection: upsert everything present, delete what's gone. */
  async function push() {
    if (!supabase || !ownerId) return
    ensureUuids()
    setState('saving')
    try {
      const rows = items.map(i => ({ ...opts.toRow(i), id: i.id, [ownerCol]: ownerId }))
      if (rows.length > 0) {
        const { error } = await supabase.from(opts.table).upsert(rows, { onConflict: 'id' })
        if (error) throw error
      }
      const keep = items.map(i => i.id)
      let del = supabase.from(opts.table).delete().eq(ownerCol, ownerId)
      if (keep.length > 0) del = del.not('id', 'in', `(${keep.join(',')})`)
      const { error: delError } = await del
      if (delError) throw delError
      lastError = null
      setState('synced')
    } catch (e) {
      // Keep the real reason — a generic failure message is impossible to debug.
      lastError = e instanceof Error ? e.message : String(e)
      console.error(`[remindly] sync failed for ${opts.table}:`, lastError)
      setState('error')
    }
  }

  function schedulePush() {
    if (!supabase || !ownerId) return
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(push, 600)
  }

  /** Replace local contents with what's on the server. */
  async function hydrate(uid: string) {
    if (!supabase) return
    ownerId = uid
    setState('loading')
    try {
      let q = supabase.from(opts.table).select('*').eq(ownerCol, uid)
      if (opts.orderBy) q = q.order(opts.orderBy.column, { ascending: opts.orderBy.ascending ?? false })
      const { data, error } = await q
      if (error) throw error

      const remote = (data ?? []).map(r => opts.fromRow(r as Record<string, unknown>))
      if (remote.length === 0 && items.length > 0 && !hydrated) {
        // First run on a fresh account: adopt whatever is already on this device.
        hydrated = true
        setState('synced')
        schedulePush()
        return
      }
      items = remote
      persistLocal()
      listeners.forEach(l => l())
      hydrated = true
      lastError = null
      setState('synced')
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
      console.error(`[remindly] load failed for ${opts.table}:`, lastError)
      setState('error')
    }
  }

  return {
    get: () => items,
    set: (next: T[]) => {
      items = next
      persistLocal()
      listeners.forEach(l => l())
      schedulePush()
    },
    subscribe: (l: () => void) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    getState: () => state,
    getError: () => lastError,
    subscribeState: (l: () => void) => {
      stateListeners.add(l)
      return () => stateListeners.delete(l)
    },
    hydrate,
    isDbMode: () => ownerId !== null,
  }
}

/** Subscribe to a synced store's connection state for a status indicator. */
export function useSyncState(store: { getState: () => SyncState; subscribeState: (l: () => void) => () => void }): SyncState {
  return useSyncExternalStore(store.subscribeState, store.getState, store.getState)
}
