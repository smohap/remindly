import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { logActivity } from './activityStore'
import { currentUserId } from './invoicesDb'
import { makeStore } from './localStore'
import { isRecurrence, type Recurrence } from './recurrence'
import { dateToOffset } from './remindersStore'
import { supabase } from './supabase'
import type { DiscoverEvent, Reminder } from '../types'

/**
 * Discover: a catalogue of events published by Super Admins that anyone can
 * subscribe to. Subscribing creates a real reminder in the person's list
 * (linked by `sourceEventId`) so it shows on Today, in Calendar and fires
 * notifications like anything else.
 *
 * The catalogue lives in `discover_events`; subscriptions in
 * `event_subscriptions`. In demo mode both are local.
 */

export interface DiscoverInput {
  title: string
  scope: string
  meta: string
  icon: string
  nextDate: string // YYYY-MM-DD
  timeLabel?: string
  recurrence?: Recurrence
}

const catalogue = makeStore<DiscoverEvent[]>('remindly.discover.v1', [])
const subs = makeStore<string[]>('remindly.discoverSubs.v1', [])

function fromRow(r: Record<string, unknown>): DiscoverEvent {
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    scope: String(r.scope ?? ''),
    meta: String(r.meta ?? ''),
    icon: String(r.icon ?? '📅'),
    nextDate: (r.next_date as string | null) ?? undefined,
    timeLabel: (r.time_label as string | null) ?? undefined,
    recurrence: isRecurrence(r.recurrence) ? r.recurrence : undefined,
  }
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `d-${Date.now()}`
}

export async function loadDiscover() {
  if (!supabase) return
  const { data } = await supabase.from('discover_events').select('*').order('next_date', { ascending: true })
  if (data) catalogue.set(data.map(r => fromRow(r as Record<string, unknown>)))
  const uid = await currentUserId()
  if (uid) {
    const { data: s } = await supabase.from('event_subscriptions').select('discover_event_id').eq('user_id', uid)
    if (s) subs.set(s.map(r => String(r.discover_event_id)))
  }
}

/** Build the reminder a subscription creates. */
export function reminderFromEvent(e: DiscoverEvent): Reminder {
  return {
    id: newId(),
    title: e.title,
    meta: [e.scope, e.meta].filter(Boolean).join(' · '),
    category: 'group',
    icon: e.icon,
    dayOffset: e.nextDate ? dateToOffset(e.nextDate) : 0,
    time: e.timeLabel,
    acknowledged: false,
    ownedByMe: true,
    recurrence: e.recurrence,
    sourceEventId: e.id,
  }
}

export function useDiscover() {
  const events = useSyncExternalStore(catalogue.subscribe, catalogue.get, catalogue.get)
  const subscribed = useSyncExternalStore(subs.subscribe, subs.get, subs.get)
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    let cancelled = false
    loadDiscover().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const subscribe = useCallback(async (event: DiscoverEvent) => {
    if (subs.get().includes(event.id)) return
    subs.set([...subs.get(), event.id])
    logActivity('subscription.added', event.title, `Subscribed — added to your reminders`)
    if (!supabase) return
    const uid = await currentUserId()
    if (uid) await supabase.from('event_subscriptions').upsert({ user_id: uid, discover_event_id: event.id }, { onConflict: 'user_id,discover_event_id' })
  }, [])

  const unsubscribe = useCallback(async (event: DiscoverEvent) => {
    subs.set(subs.get().filter(id => id !== event.id))
    logActivity('subscription.removed', event.title, 'Unsubscribed')
    if (!supabase) return
    const uid = await currentUserId()
    if (uid) await supabase.from('event_subscriptions').delete().eq('user_id', uid).eq('discover_event_id', event.id)
  }, [])

  return { events, subscribed: new Set(subscribed), loading, subscribe, unsubscribe }
}

/** Admin side: publish, edit and retire catalogue entries. */
export function useDiscoverAdmin() {
  const events = useSyncExternalStore(catalogue.subscribe, catalogue.get, catalogue.get)

  const publish = useCallback(async (input: DiscoverInput) => {
    const local: DiscoverEvent = { id: newId(), ...input }
    catalogue.set([...catalogue.get(), local])
    if (!supabase) return
    const uid = await currentUserId()
    const { data } = await supabase
      .from('discover_events')
      .insert({ title: input.title, scope: input.scope, meta: input.meta, icon: input.icon, next_date: input.nextDate, time_label: input.timeLabel ?? null, recurrence: input.recurrence ?? null, created_by: uid })
      .select('*')
      .single()
    if (data) catalogue.set(catalogue.get().map(e => (e.id === local.id ? fromRow(data as Record<string, unknown>) : e)))
  }, [])

  const remove = useCallback(async (id: string) => {
    catalogue.set(catalogue.get().filter(e => e.id !== id))
    subs.set(subs.get().filter(s => s !== id))
    if (supabase) await supabase.from('discover_events').delete().eq('id', id)
  }, [])

  return { events, publish, remove }
}
