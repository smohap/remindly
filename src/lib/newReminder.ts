import { describeRecurrence, type Recurrence } from './recurrence'
import { dateToOffset } from './remindersStore'
import type { Category, Reminder } from '../types'

/** Build a reminder from the structured "New reminder" form. */
export interface NewReminderInput {
  title: string
  date: string // YYYY-MM-DD
  time?: string // free text: "5pm", "17:00", "5:00 PM"
  recurrence?: Recurrence
  category?: Category
  /** Share with every active member of this group. */
  groupId?: string
  groupName?: string
}

const CATEGORY_ICON: Record<Category, string> = { personal: '✨', group: '👥', compliance: '📋' }
const CATEGORY_LABEL: Record<Category, string> = { personal: 'Personal', group: 'Group', compliance: 'Compliance' }

/** Normalise a typed time to the "h:mm AM/PM" shape the app uses. Undefined if unparseable. */
export function normaliseTime(input?: string): string | undefined {
  const s = (input ?? '').trim().toLowerCase()
  if (!s) return undefined
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(s)
  if (!m) return undefined
  let h = Number(m[1])
  const min = Number(m[2] ?? 0)
  if (h > 23 || min > 59) return undefined
  if (m[3]) {
    h = h % 12
    if (m[3] === 'pm') h += 12
  }
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(min).padStart(2, '0')} ${period}`
}

export function describeWhen(dayOffset: number, date: string): string {
  if (dayOffset === 0) return 'Today'
  if (dayOffset === 1) return 'Tomorrow'
  if (dayOffset === -1) return 'Yesterday'
  const d = new Date(date + 'T00:00:00')
  return dayOffset > 1 && dayOffset < 7
    ? new Intl.DateTimeFormat('en-NZ', { weekday: 'long' }).format(d)
    : new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

export function buildReminder(input: NewReminderInput, id = `r-${Date.now()}`): Reminder | null {
  const title = input.title.trim()
  if (!title || !input.date) return null
  const category: Category = input.groupId ? 'group' : (input.category ?? 'personal')
  const time = normaliseTime(input.time)
  const dayOffset = dateToOffset(input.date)
  const parts = [input.groupId && input.groupName ? input.groupName : CATEGORY_LABEL[category], time ? `${describeWhen(dayOffset, input.date)}, ${time}` : describeWhen(dayOffset, input.date)]
  if (input.recurrence) parts.push(describeRecurrence(input.recurrence))
  return {
    id,
    title: title.charAt(0).toUpperCase() + title.slice(1),
    meta: parts.join(' · '),
    category,
    icon: CATEGORY_ICON[category],
    dayOffset,
    time,
    acknowledged: false,
    ownedByMe: true,
    recurrence: input.recurrence,
    groupId: input.groupId,
  }
}
