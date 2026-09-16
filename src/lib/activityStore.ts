import { useCallback, useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { makeSyncedStore } from './syncedStore'

/**
 * The activity log behind the Inbox and History views. Every meaningful
 * thing that happens to a reminder (added, became due, acknowledged, snoozed,
 * rolled to its next occurrence, escalated) and to the account (plan changes,
 * event subscriptions) is appended here. Owner-scoped, so it syncs like the
 * other collections.
 */

export type ActivityKind =
  | 'reminder.added'
  | 'reminder.due'
  | 'reminder.acknowledged'
  | 'reminder.snoozed'
  | 'reminder.rolled'
  | 'reminder.escalated'
  | 'reminder.removed'
  | 'subscription.added'
  | 'subscription.removed'
  | 'plan.changed'
  | 'group.invited'
  | 'group.requested'
  | 'group.approved'

export interface ActivityEntry {
  id: string
  kind: ActivityKind
  title: string
  detail?: string
  reminderId?: string
  read: boolean
  at: string // ISO timestamp
}

const MAX_ENTRIES = 500

const store = makeSyncedStore<ActivityEntry>({
  key: 'remindly.activity.v1',
  table: 'activity',
  orderBy: { column: 'at', ascending: false },
  toRow: e => ({ kind: e.kind, title: e.title, detail: e.detail ?? null, reminder_id: e.reminderId ?? null, read: e.read, at: e.at }),
  fromRow: r => ({
    id: String(r.id),
    kind: (r.kind as ActivityKind) ?? 'reminder.added',
    title: String(r.title ?? ''),
    detail: (r.detail as string | null) ?? undefined,
    reminderId: (r.reminder_id as string | null) ?? undefined,
    read: Boolean(r.read),
    at: String(r.at ?? new Date().toISOString()),
  }),
  seed: [],
  // The notify_membership trigger writes rows here too; never prune them.
  pruneRemote: false,
})

export const activityStore = store

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Pure helper so the append rule can be unit-tested without React. */
export function appendEntry(
  entries: ActivityEntry[],
  input: { kind: ActivityKind; title: string; detail?: string; reminderId?: string; read?: boolean },
  at: string = new Date().toISOString(),
): ActivityEntry[] {
  const entry: ActivityEntry = { id: newId(), read: false, ...input, at }
  return [entry, ...entries].slice(0, MAX_ENTRIES)
}

/** Kinds that a person needs to *see* — they land unread in the Inbox. */
export const INBOX_KINDS: ActivityKind[] = ['reminder.due', 'reminder.escalated', 'plan.changed', 'subscription.added', 'group.invited', 'group.requested', 'group.approved']

export function logActivity(kind: ActivityKind, title: string, detail?: string, reminderId?: string) {
  // Things you did yourself (adding, acknowledging) are history, not news.
  const read = !INBOX_KINDS.includes(kind)
  store.set(appendEntry(store.get(), { kind, title, detail, reminderId, read }))
}

export async function hydrateActivity(uid: string) {
  await store.hydrate(uid)
}

export function useActivity() {
  const entries = useSyncExternalStore(store.subscribe, store.get, store.get)
  const unread = entries.filter(e => !e.read).length
  const markRead = useCallback((id: string) => {
    store.set(store.get().map(e => (e.id === id ? { ...e, read: true } : e)))
  }, [])
  const markAllRead = useCallback(() => {
    if (store.get().some(e => !e.read)) store.set(store.get().map(e => ({ ...e, read: true })))
  }, [])
  const clear = useCallback(() => {
    const uid = store.ownerId()
    store.set([])
    if (uid) void supabase?.from('activity').delete().eq('owner_id', uid)
  }, [])
  return { entries, unread, markRead, markAllRead, clear }
}

/** Pull server-written notifications (membership events) without a reload. */
export async function refreshActivity() {
  await store.refresh()
}
