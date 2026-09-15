/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { logActivity } from './lib/activityStore'
import { parseReminder } from './lib/nlParse'
import { nextOccurrence } from './lib/recurrence'
import { dateToOffset, offsetToDate, remindersStore } from './lib/remindersStore'
import { currentUserId } from './lib/invoicesDb'
import { isSnoozed, snoozeLabel, snoozeUntil, type SnoozeKey } from './lib/snooze'
import type { Filter, Reminder, Tab, ToggleKey } from './types'

interface State {
  reminders: Reminder[]
  filter: Filter
  tab: Tab
  toggles: Record<ToggleKey, boolean>
  /** Wall clock, refreshed every 30 s so snoozes expire without a reload. */
  now: number
  snoozeTargetId: string | null
  editTargetId: string | null
  quickAddOpen: boolean
  announcement: string
}

type Action =
  | { type: 'acknowledge'; id: string }
  | { type: 'acknowledgeMany'; ids: string[] }
  | { type: 'snooze'; id: string; key: SnoozeKey }
  | { type: 'unsnooze'; id: string }
  | { type: 'tick' }
  | { type: 'add'; title: string }
  | { type: 'setFilter'; filter: Filter }
  | { type: 'setTab'; tab: Tab }
  | { type: 'toggle'; key: ToggleKey }
  | { type: 'openSnooze'; id: string | null }
  | { type: 'setQuickAdd'; open: boolean }
  | { type: 'edit'; id: string; patch: Partial<Reminder> }
  | { type: 'remove'; id: string }
  | { type: 'openEdit'; id: string | null }
  | { type: 'hydrate'; reminders: Reminder[] }

const initialState: State = {
  // Start from whatever is already on this device; the server copy replaces it
  // once the user is known (see StoreProvider).
  reminders: remindersStore.get(),
  filter: 'today',
  tab: 'today',
  toggles: { personalAlarm: true, push: true, email: true, sms: false, slack: true, quietHours: true },
  now: Date.now(),
  snoozeTargetId: null,
  editTargetId: null,
  quickAddOpen: false,
  announcement: '',
}

function describeOffset(dayOffset: number): string {
  if (dayOffset === 0) return 'today'
  if (dayOffset === 1) return 'tomorrow'
  return new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' }).format(
    new Date(offsetToDate(dayOffset) + 'T00:00:00'),
  )
}

/**
 * Completing a reminder. A one-off is marked acknowledged; a recurring one
 * rolls forward to its next occurrence and stays active, with the completion
 * recorded in the activity log so History still shows it was done.
 */
export function acknowledgeOne(r: Reminder): Reminder {
  if (!r.recurrence) {
    logActivity('reminder.acknowledged', r.title, r.meta, r.id)
    return { ...r, acknowledged: true, snoozedUntil: undefined }
  }
  const next = nextOccurrence(offsetToDate(r.dayOffset), r.recurrence)
  const dayOffset = dateToOffset(next)
  logActivity('reminder.acknowledged', r.title, `Done — next ${describeOffset(dayOffset)}`, r.id)
  return { ...r, dayOffset, acknowledged: false, snoozedUntil: undefined }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'acknowledge': {
      const target = state.reminders.find(r => r.id === action.id)
      if (!target) return state
      const done = acknowledgeOne(target)
      return {
        ...state,
        reminders: state.reminders.map(r => (r.id === action.id ? done : r)),
        announcement: done.acknowledged ? `${target.title} acknowledged` : `${target.title} done — next ${describeOffset(done.dayOffset)}`,
      }
    }
    case 'acknowledgeMany':
      return {
        ...state,
        reminders: state.reminders.map(r => (action.ids.includes(r.id) ? acknowledgeOne(r) : r)),
        announcement: 'All reminders acknowledged',
      }
    case 'snooze': {
      const target = state.reminders.find(r => r.id === action.id)
      if (!target) return state
      const until = snoozeUntil(action.key)
      logActivity('reminder.snoozed', target.title, `Snoozed ${snoozeLabel(until)}`, target.id)
      return {
        ...state,
        reminders: state.reminders.map(r => (r.id === action.id ? { ...r, snoozedUntil: until } : r)),
        snoozeTargetId: null,
        announcement: `${target.title} snoozed ${snoozeLabel(until)}`,
      }
    }
    case 'unsnooze': {
      const target = state.reminders.find(r => r.id === action.id)
      if (!target) return state
      return {
        ...state,
        reminders: state.reminders.map(r => (r.id === action.id ? { ...r, snoozedUntil: undefined } : r)),
        announcement: `${target.title} is back on your list`,
      }
    }
    case 'tick':
      return { ...state, now: Date.now() }
    case 'add': {
      if (!action.title.trim()) return state
      // Killer feature: parse natural language into a scheduled, categorised reminder.
      const parsed = parseReminder(action.title)
      if (!parsed.title) return state
      const reminder: Reminder = {
        id: `r-${Date.now()}`,
        title: parsed.title,
        meta: parsed.meta,
        category: parsed.category,
        tag: parsed.tag,
        icon: parsed.icon,
        dayOffset: parsed.dayOffset,
        time: parsed.time,
        acknowledged: false,
        ownedByMe: true,
        recurrence: parsed.recurrence,
      }
      logActivity('reminder.added', reminder.title, reminder.meta, reminder.id)
      return { ...state, reminders: [reminder, ...state.reminders], quickAddOpen: false, announcement: `Reminder added: ${parsed.title}` }
    }
    case 'setFilter':
      return { ...state, filter: action.filter }
    case 'setTab':
      return { ...state, tab: action.tab }
    case 'toggle':
      return { ...state, toggles: { ...state.toggles, [action.key]: !state.toggles[action.key] } }
    case 'openSnooze':
      return { ...state, snoozeTargetId: action.id }
    case 'setQuickAdd':
      return { ...state, quickAddOpen: action.open }
    case 'edit': {
      // Only the creator may change a reminder.
      const target = state.reminders.find(r => r.id === action.id)
      if (!target || target.ownedByMe === false) return state
      return {
        ...state,
        reminders: state.reminders.map(r => (r.id === action.id ? { ...r, ...action.patch } : r)),
        editTargetId: null,
        announcement: `${action.patch.title ?? target.title} updated`,
      }
    }
    case 'remove': {
      const target = state.reminders.find(r => r.id === action.id)
      if (!target || target.ownedByMe === false) return state
      logActivity('reminder.removed', target.title, undefined, target.id)
      return {
        ...state,
        reminders: state.reminders.filter(r => r.id !== action.id),
        editTargetId: null,
        announcement: `${target.title} deleted`,
      }
    }
    case 'openEdit':
      return { ...state, editTargetId: action.id }
    case 'hydrate':
      return { ...state, reminders: action.reminders }
  }
}

export interface Derived {
  active: Reminder[]
  snoozed: Reminder[]
  counts: { today: number; tomorrow: number; week: number; overdue: number }
  done: number
  total: number
  percent: number
  compliancePending: number
  nextUp: Reminder | null
}

export function timeMinutes(time?: string): number {
  if (!time) return Number.POSITIVE_INFINITY
  const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(time)
  if (!m) return Number.POSITIVE_INFINITY
  let hours = Number(m[1]) % 12
  if (m[3].toUpperCase() === 'PM') hours += 12
  return hours * 60 + Number(m[2])
}

interface Actions {
  acknowledge: (id: string) => void
  acknowledgeMany: (ids: string[]) => void
  snooze: (id: string, key: SnoozeKey) => void
  unsnooze: (id: string) => void
  add: (title: string) => void
  setFilter: (filter: Filter) => void
  setTab: (tab: Tab) => void
  toggle: (key: ToggleKey) => void
  openSnooze: (id: string | null) => void
  setQuickAdd: (open: boolean) => void
  edit: (id: string, patch: Partial<Reminder>) => void
  remove: (id: string) => void
  openEdit: (id: string | null) => void
}

interface StoreValue {
  state: State
  derived: Derived
  actions: Actions
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const hydrated = useRef(false)

  // Load: adopt the on-device copy immediately, then the server copy once we
  // know who is signed in.
  useEffect(() => {
    let cancelled = false
    const unsubscribe = remindersStore.subscribe(() => {
      if (!cancelled) dispatch({ type: 'hydrate', reminders: remindersStore.get() })
    })
    currentUserId().then(async uid => {
      if (uid && !cancelled) await remindersStore.hydrate(uid)
      if (!cancelled) hydrated.current = true
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  // Save: every change to the list is written through, on-device straight away
  // and to Postgres in the background.
  useEffect(() => {
    if (!hydrated.current) return
    if (state.reminders === remindersStore.get()) return
    remindersStore.set(state.reminders)
  }, [state.reminders])

  const derived = useMemo<Derived>(() => {
    const now = new Date(state.now)
    const snoozed = state.reminders.filter(r => !r.acknowledged && isSnoozed(r.snoozedUntil, now))
    const active = state.reminders.filter(r => !r.acknowledged && !isSnoozed(r.snoozedUntil, now))
    const counts = {
      today: active.filter(r => r.dayOffset === 0).length,
      tomorrow: active.filter(r => r.dayOffset === 1).length,
      week: active.filter(r => r.dayOffset >= 0 && r.dayOffset <= 6).length,
      overdue: active.filter(r => r.dayOffset < 0).length,
    }
    const todayAll = state.reminders.filter(r => r.dayOffset === 0)
    const total = todayAll.length
    const done = todayAll.filter(r => r.acknowledged).length
    const nextUp =
      active
        .filter(r => r.dayOffset === 0 && r.time)
        .sort((a, b) => timeMinutes(a.time) - timeMinutes(b.time))[0] ?? null
    return {
      active,
      snoozed,
      counts,
      done,
      total,
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
      compliancePending: active.filter(r => r.category === 'compliance' && r.dayOffset === 0).length,
      nextUp,
    }
  }, [state.reminders, state.now])

  // Let snoozes expire on their own.
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'tick' }), 30_000)
    return () => clearInterval(id)
  }, [])

  const actions = useMemo<Actions>(
    () => ({
      acknowledge: id => dispatch({ type: 'acknowledge', id }),
      acknowledgeMany: ids => dispatch({ type: 'acknowledgeMany', ids }),
      snooze: (id, key) => dispatch({ type: 'snooze', id, key }),
      unsnooze: id => dispatch({ type: 'unsnooze', id }),
      add: title => dispatch({ type: 'add', title }),
      setFilter: filter => dispatch({ type: 'setFilter', filter }),
      setTab: tab => dispatch({ type: 'setTab', tab }),
      toggle: key => dispatch({ type: 'toggle', key }),
      openSnooze: id => dispatch({ type: 'openSnooze', id }),
      setQuickAdd: open => dispatch({ type: 'setQuickAdd', open }),
      edit: (id, patch) => dispatch({ type: 'edit', id, patch }),
      remove: id => dispatch({ type: 'remove', id }),
      openEdit: id => dispatch({ type: 'openEdit', id }),
    }),
    [],
  )

  const value = useMemo(() => ({ state, derived, actions }), [state, derived, actions])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
