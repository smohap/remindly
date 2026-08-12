import { useCallback, useEffect, useRef, useState } from 'react'
import type { Reminder } from '../types'

/**
 * Desktop and mobile notifications for due reminders.
 *
 * Rules:
 *  - A reminder with a specific time starts nudging ONE HOUR before it is due.
 *  - A daily / all-day reminder starts nudging from the beginning of its day.
 *  - Either way it repeats every 15 MINUTES until the reminder is acknowledged.
 *  - Quiet hours hold back everything except compliance, which always breaks through.
 *
 * Caveat: iOS Safari only delivers web notifications once the app has been added
 * to the Home Screen (installed as a PWA).
 */

const KEY = 'remindly.notify.v1'
const REPEAT_MS = 15 * 60 * 1000
const LEAD_MS = 60 * 60 * 1000
const TICK_MS = 30 * 1000

type SentMap = Record<string, number>

function loadSent(): SentMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as SentMap
  } catch {
    return {}
  }
}
function saveSent(m: SentMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m))
  } catch {
    /* ignore */
  }
}

/** "5:00 PM" -> minutes since midnight. Undefined for all-day reminders. */
export function parseClock(time?: string): number | undefined {
  if (!time) return undefined
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim())
  if (!m) return undefined
  let h = Number(m[1]) % 12
  if (/pm/i.test(m[3])) h += 12
  return h * 60 + Number(m[2])
}

/** The moment a reminder starts nudging, or null if it never should. */
export function dueWindowStart(r: Reminder, now = new Date()): number | null {
  if (r.acknowledged) return null
  const day = new Date(now)
  day.setHours(0, 0, 0, 0)
  day.setDate(day.getDate() + r.dayOffset)

  const clock = parseClock(r.time)
  if (clock === undefined) {
    // All-day or daily: nudge from the start of its day.
    return day.getTime()
  }
  const due = new Date(day)
  due.setMinutes(clock)
  return due.getTime() - LEAD_MS
}

function inQuietHours(now = new Date()): boolean {
  const h = now.getHours()
  return h >= 22 || h < 7
}

export function useNotifications(reminders: Reminder[], opts: { quietHours: boolean }) {
  const supported = typeof window !== 'undefined' && 'Notification' in window
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    supported ? Notification.permission : 'unsupported',
  )
  const sent = useRef<SentMap>(loadSent())
  const quietRef = useRef(opts.quietHours)
  quietRef.current = opts.quietHours

  const request = useCallback(async () => {
    if (!supported) return 'unsupported' as const
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      new Notification('Remindly notifications are on', {
        body: "We'll nudge you when something needs you.",
        tag: 'remindly-welcome',
      })
    }
    return result
  }, [supported])

  const remindersRef = useRef(reminders)
  remindersRef.current = reminders

  useEffect(() => {
    if (!supported || permission !== 'granted') return

    const tick = () => {
      const now = Date.now()
      let changed = false

      for (const r of remindersRef.current) {
        if (r.acknowledged) {
          if (sent.current[r.id]) {
            delete sent.current[r.id]
            changed = true
          }
          continue
        }

        const start = dueWindowStart(r)
        if (start === null || now < start) continue

        // Quiet hours hold back everything except compliance items.
        if (quietRef.current && inQuietHours() && r.category !== 'compliance') continue

        const last = sent.current[r.id] ?? 0
        if (now - last < REPEAT_MS) continue

        const overdue = r.dayOffset < 0
        new Notification(overdue ? `Overdue: ${r.title}` : r.title, {
          body: r.meta,
          tag: `remindly-${r.id}`, // replaces the previous nudge instead of stacking
          requireInteraction: r.category === 'compliance',
        })
        sent.current[r.id] = now
        changed = true
      }

      if (changed) saveSent(sent.current)
    }

    tick()
    const id = setInterval(tick, TICK_MS)
    return () => clearInterval(id)
  }, [supported, permission])

  return { supported, permission, request }
}
