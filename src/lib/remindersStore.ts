import { supabase } from './supabase'
import { makeSyncedStore } from './syncedStore'
import { isRecurrence } from './recurrence'
import type { Reminder } from '../types'

/**
 * Persistence for the reminder list itself.
 *
 * Reminders are held in the UI as `dayOffset` (days from today) because the
 * dashboard is built around Today / Tomorrow / This week. That is a *view*
 * concept and must never be stored: a reminder saved as "tomorrow" would still
 * claim to be tomorrow a week later. So we convert to an absolute date on the
 * way out, and back to an offset on the way in.
 */

const DAY = 86400000

function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** dayOffset -> 'YYYY-MM-DD' */
export function offsetToDate(dayOffset: number): string {
  const d = new Date(startOfToday() + dayOffset * DAY)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 'YYYY-MM-DD' -> dayOffset relative to today */
export function dateToOffset(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const target = new Date(y, (m ?? 1) - 1, d ?? 1)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - startOfToday()) / DAY)
}

export const remindersStore = makeSyncedStore<Reminder>({
  key: 'remindly.reminders.v1',
  table: 'events',
  orderBy: { column: 'due_date', ascending: true },
  toRow: r => ({
    title: r.title,
    meta: r.meta,
    category: r.category,
    tag: r.tag ?? null,
    icon: r.icon,
    due_date: offsetToDate(r.dayOffset),
    time_label: r.time ?? null,
    acknowledged: r.acknowledged,
    snoozed_until: r.snoozedUntil ?? null,
    daily: r.recurrence === 'daily',
    recurrence: r.recurrence ?? null,
    source_event_id: r.sourceEventId ?? null,
    group_id: r.groupId ?? null,
    resolve_label: r.resolveLabel ?? null,
    is_compliance: r.category === 'compliance',
    all_day: !r.time,
  }),
  fromRow: (row, uid) => ({
    id: String(row.id),
    title: String(row.title ?? ''),
    meta: String(row.meta ?? ''),
    category: (row.category as Reminder['category']) ?? 'personal',
    tag: (row.tag as string | null) ?? undefined,
    icon: String(row.icon ?? '🔔'),
    dayOffset: row.due_date ? dateToOffset(String(row.due_date)) : 0,
    time: (row.time_label as string | null) ?? undefined,
    acknowledged: Boolean(row.acknowledged),
    snoozedUntil: (row.snoozed_until as string | null) ?? undefined,
    // `daily` predates `recurrence`; rows saved before the column existed still carry it.
    recurrence: isRecurrence(row.recurrence) ? row.recurrence : row.daily ? 'daily' : undefined,
    sourceEventId: (row.source_event_id as string | null) ?? undefined,
    resolveLabel: (row.resolve_label as string | null) ?? undefined,
    groupId: (row.group_id as string | null) ?? undefined,
    ownerId: (row.owner_id as string | null) ?? undefined,
    // Group reminders are visible to every active member, but only the
    // creator may edit or delete them.
    ownedByMe: !row.owner_id || row.owner_id === uid,
  }),
  seed: [],
  // Load everything RLS shows me (own + my groups'); only push my own rows.
  scope: 'visible',
  own: r => r.ownedByMe !== false,
  afterLoad: overlayStatus,
})

/**
 * Acknowledge / snooze on a reminder I don't own can't touch the event row
 * (owner-only writes), so it lives per person in reminder_status.
 */
async function overlayStatus(items: Reminder[], uid: string): Promise<Reminder[]> {
  if (!supabase) return items
  const foreign = items.filter(r => r.ownedByMe === false)
  if (foreign.length === 0) return items
  const { data } = await supabase.from('reminder_status').select('event_id, state, snoozed_until, acknowledged_at').eq('user_id', uid).in('event_id', foreign.map(r => r.id))
  const byEvent = new Map((data ?? []).map(r => [String(r.event_id), r]))
  return items.map(r => {
    if (r.ownedByMe !== false) return r
    const st = byEvent.get(r.id)
    if (!st) return { ...r, acknowledged: false, snoozedUntil: undefined }
    // An ack made before the owner rolled the reminder to a later date belongs to the old occurrence.
    const ackedAt = (st.acknowledged_at as string | null) ?? null
    const stillCurrent = !ackedAt || ackedAt.slice(0, 10) >= offsetToDate(r.dayOffset)
    return { ...r, acknowledged: st.state === 'acknowledged' && stillCurrent, snoozedUntil: (st.snoozed_until as string | null) ?? undefined }
  })
}

/** Persist my own acknowledge/snooze state for a reminder someone else owns. */
export async function saveForeignStatus(r: Reminder) {
  if (!supabase) return
  const { data } = await supabase.auth.getUser()
  const uid = data.user?.id
  if (!uid) return
  const state = r.acknowledged ? 'acknowledged' : r.snoozedUntil ? 'snoozed' : 'pending'
  await supabase.from('reminder_status').upsert(
    { event_id: r.id, user_id: uid, state, snoozed_until: r.snoozedUntil ?? null, acknowledged_at: r.acknowledged ? new Date().toISOString() : null, updated_at: new Date().toISOString() },
    { onConflict: 'event_id,user_id' },
  )
}
