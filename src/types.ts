import type { Recurrence } from './lib/recurrence'

export type Category = 'compliance' | 'group' | 'personal'

export interface Reminder {
  id: string
  title: string
  meta: string
  category: Category
  tag?: string
  icon: string
  /** Days from today: -1 = yesterday (overdue), 0 = today, 1 = tomorrow… */
  dayOffset: number
  time?: string
  acknowledged: boolean
  /** ISO timestamp; the reminder is hidden from the active list until then. */
  snoozedUntil?: string
  resolveLabel?: string
  /** Only the creator may edit or delete a reminder. */
  ownedByMe?: boolean
  /** Repeat cadence; acknowledging rolls the reminder to its next occurrence. */
  recurrence?: Recurrence
  /** Set when the reminder was created by subscribing to a Discover event. */
  sourceEventId?: string
  /** Shared with every active member of this group. */
  groupId?: string
  /** Profile id of the creator (server rows only). */
  ownerId?: string
}

export type Filter = 'today' | 'tomorrow' | 'week' | 'overdue'

export type Tab = 'today' | 'calendar' | 'workspace' | 'groups' | 'finance' | 'business' | 'inbox' | 'settings' | 'admin' | 'upgrade'

export interface DiscoverEvent {
  id: string
  title: string
  scope: string
  meta: string
  icon: string
  /** YYYY-MM-DD of the next occurrence; drives the reminder created on subscribe. */
  nextDate?: string
  timeLabel?: string
  recurrence?: Recurrence
}
