import { makeSyncedStore } from './syncedStore'
import { seedReminders } from '../data'
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
    daily: r.daily ?? false,
    resolve_label: r.resolveLabel ?? null,
    is_compliance: r.category === 'compliance',
    all_day: !r.time,
  }),
  fromRow: row => ({
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
    daily: Boolean(row.daily),
    resolveLabel: (row.resolve_label as string | null) ?? undefined,
    // Rows come back through RLS scoped to the signed-in user, so anything
    // fetched here is theirs to edit.
    ownedByMe: true,
  }),
  seed: seedReminders,
})
