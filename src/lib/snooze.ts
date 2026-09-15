/**
 * Snooze options resolve to a concrete timestamp. A snoozed reminder stays
 * out of the active list until then and reappears on its own.
 */

export type SnoozeKey = 'hour' | 'evening' | 'tomorrow' | 'nextWeek'

export const SNOOZE_OPTIONS: { key: SnoozeKey; label: string; hint: string }[] = [
  { key: 'hour', label: '1 hour', hint: 'Back in an hour' },
  { key: 'evening', label: 'This evening', hint: '6:00 PM' },
  { key: 'tomorrow', label: 'Tomorrow', hint: '9:00 AM' },
  { key: 'nextWeek', label: 'Next week', hint: 'Monday, 9:00 AM' },
]

export function snoozeUntil(key: SnoozeKey, now: Date = new Date()): string {
  const at = new Date(now)
  switch (key) {
    case 'hour':
      at.setHours(at.getHours() + 1)
      break
    case 'evening':
      at.setHours(18, 0, 0, 0)
      if (at <= now) at.setDate(at.getDate() + 1)
      break
    case 'tomorrow':
      at.setDate(at.getDate() + 1)
      at.setHours(9, 0, 0, 0)
      break
    case 'nextWeek': {
      // Days until next Monday; a Monday goes to the Monday after.
      const delta = (8 - at.getDay()) % 7 || 7
      at.setDate(at.getDate() + delta)
      at.setHours(9, 0, 0, 0)
      break
    }
  }
  return at.toISOString()
}

export function isSnoozed(iso: string | undefined, now: Date = new Date()): boolean {
  if (!iso) return false
  const t = Date.parse(iso)
  return Number.isFinite(t) && t > now.getTime()
}

const timeFmt = new Intl.DateTimeFormat('en-NZ', { hour: 'numeric', minute: '2-digit', hour12: true })
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function upperAmPm(s: string): string {
  return s.replace(/\s?(am|pm)$/i, (_, ap: string) => ' ' + ap.toUpperCase())
}

export function snoozeLabel(iso: string, now: Date = new Date()): string {
  const at = new Date(iso)
  const time = upperAmPm(timeFmt.format(at))
  if (at.toDateString() === now.toDateString()) return `until ${time}`
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (at.toDateString() === tomorrow.toDateString()) return `until tomorrow ${time}`
  return `until ${DAYS[at.getDay()]} ${at.getDate()} ${MONTHS[at.getMonth()]}, ${time}`
}
