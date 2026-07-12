import type { Category } from '../types'

export interface ParsedReminder {
  title: string
  dayOffset: number
  time?: string
  category: Category
  icon: string
  tag?: string
  meta: string
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const CATEGORY_HINTS: { category: Category; icon: string; words: string[] }[] = [
  { category: 'compliance', icon: '📋', words: ['compliance', 'safety', 'audit', 'contract', 'checklist', 'inspection', 'sign', 'renew', 'policy', 'deadline', 'invoice', 'tax', 'gst'] },
  { category: 'group', icon: '👥', words: ['team', 'meeting', 'standup', 'stand-up', 'practice', 'training', 'crew', 'briefing', 'rugby', 'match', 'call with', 'sync', 'review', 'client'] },
]

const ICON_HINTS: { icon: string; words: string[] }[] = [
  { icon: '🎂', words: ['birthday', 'anniversary'] },
  { icon: '💊', words: ['medicine', 'pill', 'medication', 'physio', 'doctor', 'dentist', 'appointment'] },
  { icon: '🚗', words: ['car', 'registration', 'rego', 'wof', 'service'] },
  { icon: '💰', words: ['pay', 'bill', 'invoice', 'rent', 'tax', 'gst'] },
  { icon: '🏉', words: ['rugby', 'match', 'game', 'practice'] },
  { icon: '✈️', words: ['flight', 'travel', 'trip', 'airport'] },
  { icon: '🎉', words: ['party', 'celebrate', 'drinks'] },
]

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

/** Format 24h hour+min into the "h:mm AM/PM" shape the rest of the app uses. */
function formatTime(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${pad(m)} ${period}`
}

/** Parse a free-text reminder into a structured, scheduled reminder. */
export function parseReminder(input: string, now = new Date()): ParsedReminder {
  const raw = input.trim()
  const lower = raw.toLowerCase()

  // ---- time ----
  let time: string | undefined
  const noon = /\b(noon|midday)\b/.exec(lower)
  const midnight = /\bmidnight\b/.exec(lower)
  const clock = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/.exec(lower)
  const h24 = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(lower)
  if (noon) time = '12:00 PM'
  else if (midnight) time = '12:00 AM'
  else if (clock) {
    let h = Number(clock[1]) % 12
    if (clock[3] === 'pm') h += 12
    time = formatTime(h, clock[2] ? Number(clock[2]) : 0)
  } else if (h24) {
    time = formatTime(Number(h24[1]), Number(h24[2]))
  }

  // ---- day offset ----
  let dayOffset = 0
  const inDays = /\bin (\d{1,2}) days?\b/.exec(lower)
  const nextWeekday = /\bnext (sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/.exec(lower)
  const onWeekday = /\b(?:on |this )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/.exec(lower)
  if (/\btomorrow\b/.test(lower)) dayOffset = 1
  else if (/\btonight\b/.test(lower)) {
    dayOffset = 0
    if (!time) time = '8:00 PM'
  } else if (/\btoday\b/.test(lower)) dayOffset = 0
  else if (/\bnext week\b/.test(lower)) dayOffset = 7
  else if (inDays) dayOffset = Number(inDays[1])
  else if (nextWeekday) {
    const target = WEEKDAYS.indexOf(nextWeekday[1])
    dayOffset = ((target - now.getDay() + 7) % 7 || 7) + 7
  } else if (onWeekday) {
    const target = WEEKDAYS.indexOf(onWeekday[1])
    dayOffset = (target - now.getDay() + 7) % 7 || 7
  }

  // ---- recurrence (informational tag) ----
  const every = /\bevery [\w\s]+?(?=(?: at | on |$))/.exec(lower)
  const tag = every ? `Repeats ${every[0].replace(/^every /, 'every ')}`.trim() : undefined

  // ---- category + icon ----
  let category: Category = 'personal'
  let icon = '✨'
  for (const hint of CATEGORY_HINTS) {
    if (hint.words.some(w => lower.includes(w))) {
      category = hint.category
      icon = hint.icon
      break
    }
  }
  for (const hint of ICON_HINTS) {
    if (hint.words.some(w => lower.includes(w))) {
      icon = hint.icon
      break
    }
  }

  // ---- title: strip command lead-ins and the date/time phrases we consumed ----
  let title = raw
    .replace(/^\s*(remind me to|remind me|reminder to|remind|remember to|note to)\s+/i, '')
    .replace(/\b(every [\w\s]+?)(?=(?: at | on |$))/i, '')
    .replace(/\bnext (sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, '')
    .replace(/\b(?:on |this )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, '')
    .replace(/\bin \d{1,2} days?\b/gi, '')
    .replace(/\b(today|tomorrow|tonight|next week|noon|midday|midnight)\b/gi, '')
    .replace(/\bat \d{1,2}(?::\d{2})?\s*(am|pm)?\b/gi, '')
    .replace(/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,–-]+|[\s,–-]+$/g, '')
    .trim()
  if (!title) title = raw.replace(/^\s*(remind me to|remind me|remind)\s+/i, '').trim()
  title = title.charAt(0).toUpperCase() + title.slice(1)

  // ---- human-readable meta line ----
  const when = dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : `In ${dayOffset} days`
  const scope = category === 'compliance' ? 'Compliance' : category === 'group' ? 'Group' : 'Personal'
  const parts = [scope, time ? `${when}, ${time}` : when]
  if (tag) parts.push(tag)
  const meta = parts.join(' · ')

  return { title, dayOffset, time, category, icon, tag, meta }
}
