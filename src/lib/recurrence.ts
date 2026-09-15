/**
 * Recurring reminders. A reminder with a `recurrence` is a single row that
 * rolls forward to its next occurrence when acknowledged — there is no series
 * table or per-occurrence exceptions.
 */

export type Recurrence = 'daily' | 'weekdays' | 'weekly' | 'fortnightly' | 'monthly' | 'yearly'

export const RECURRENCES: { value: Recurrence; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Every weekday' },
  { value: 'weekly', label: 'Every week' },
  { value: 'fortnightly', label: 'Every fortnight' },
  { value: 'monthly', label: 'Every month' },
  { value: 'yearly', label: 'Every year' },
]

export function describeRecurrence(r: Recurrence): string {
  return RECURRENCES.find(x => x.value === r)?.label ?? ''
}

export function isRecurrence(v: unknown): v is Recurrence {
  return typeof v === 'string' && RECURRENCES.some(r => r.value === v)
}

function parse(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number)
  return [y, m, d]
}

function fmt(y: number, m: number, d: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${y}-${pad(m)}-${pad(d)}`
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = parse(iso)
  const dt = new Date(y, m - 1, d + n)
  return fmt(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
}

/** Add months keeping the day-of-month where possible, clamping to month end. */
function addMonths(iso: string, n: number, anchorDay: number): string {
  const [y, m] = parse(iso)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return fmt(ny, nm, Math.min(anchorDay, daysInMonth(ny, nm)))
}

function step(iso: string, r: Recurrence, anchorDay: number): string {
  switch (r) {
    case 'daily':
      return addDays(iso, 1)
    case 'weekdays': {
      let next = addDays(iso, 1)
      while ([0, 6].includes(new Date(next + 'T00:00:00').getDay())) next = addDays(next, 1)
      return next
    }
    case 'weekly':
      return addDays(iso, 7)
    case 'fortnightly':
      return addDays(iso, 14)
    case 'monthly':
      return addMonths(iso, 1, anchorDay)
    case 'yearly':
      return addMonths(iso, 12, anchorDay)
  }
}

export function todayISO(): string {
  const d = new Date()
  return fmt(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

/**
 * The first occurrence strictly after `from` (default today). Used when a
 * recurring reminder is acknowledged: an overdue weekly reminder rolls to
 * the next slot in the future, not to one that is still in the past.
 */
export function nextOccurrence(dueISO: string, r: Recurrence, from: string = todayISO()): string {
  const anchorDay = parse(dueISO)[2]
  let next = step(dueISO, r, anchorDay)
  let guard = 0
  while (next <= from && guard < 5000) {
    next = step(next, r, anchorDay)
    guard++
  }
  return next
}
