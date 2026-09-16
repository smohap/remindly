/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { logActivity } from './lib/activityStore'
import { parseReminder } from './lib/nlParse'
import { nextOccurrence } from './lib/recurrence'
import { dateToOffset, offsetToDate, remindersStore, saveForeignStatus } from './lib/remindersStore'
import { currentUserId } from './lib/invoicesDb'
import { isSnoozed, snoozeLabel, snoozeUntil, type SnoozeKey } from './lib/snooze'
import type { Feature } from './lib/plans'
import type { Filter, Reminder, Tab } from './types'

interface State {
  reminders: Reminder[]
  filter: Filter
  tab: Tab
  /** A segment requested for the current tab (consumed by useSegment). */
  segment: string | null
  /** Wall clock, refreshed every 30 s so snoozes expire without a reload. */
  now: number
  snoozeTargetId: string | null
  editTargetId: string | null
  quickAddOpen: boolean
  announcement: string
  /** Feature that triggered the upgrade chooser, so the right plan is pre-selected. */
  upgradeFeature: Feature | null
  /** Where to return after the chooser closes. */
  upgradeReturnTab: Tab
}

type Action =
  | { type: 'acknowledge'; id: string }
  | { type: 'acknowledgeMany'; ids: string[] }
  | { type: 'snooze'; id: string; until: string }
  | { type: 'unsnooze'; id: string }
  | { type: 'tick' }
  | { type: 'addReminder'; reminder: Reminder }
  | { type: 'removeBySource'; sourceEventId: string }
  | { type: 'setFilter'; filter: Filter }
  | { type: 'setTab'; tab: Tab; segment?: string }
  | { type: 'clearSegment' }
  | { type: 'openSnooze'; id: string | null }
  | { type: 'setQuickAdd'; open: boolean }
  | { type: 'edit'; id: string; patch: Partial<Reminder> }
  | { type: 'remove'; id: string }
  | { type: 'openEdit'; id: string | null }
  | { type: 'hydrate'; reminders: Reminder[] }
  | { type: 'openUpgrade'; feature: Feature | null }

const initialState: State = {
  // Start from whatever is already on this device; the server copy replaces it
  // once the user is known (see StoreProvider).
  reminders: remindersStore.get(),
  filter: 'today',
  tab: 'today',
  segment: null,
  now: Date.now(),
  snoozeTargetId: null,
  editTargetId: null,
  quickAddOpen: false,
  announcement: '',
  upgradeFeature: null,
  upgradeReturnTab: 'today',
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
  // Only the owner rolls a recurring reminder; a member's ack covers the current occurrence.
  if (!r.recurrence || r.ownedByMe === false) return { ...r, acknowledged: true, snoozedUntil: undefined }
  const next = nextOccurrence(offsetToDate(r.dayOffset), r.recurrence)
  return { ...r, dayOffset: dateToOffset(next), acknowledged: false, snoozedUntil: undefined }
}

/** What the activity log should say when `r` is completed. */
function completionDetail(r: Reminder): string | undefined {
  return r.recurrence && r.ownedByMe !== false ? `Done — next ${describeOffset(acknowledgeOne(r).dayOffset)}` : r.meta
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
      return {
        ...state,
        reminders: state.reminders.map(r => (r.id === action.id ? { ...r, snoozedUntil: action.until } : r)),
        snoozeTargetId: null,
        announcement: `${target.title} snoozed ${snoozeLabel(action.until)}`,
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
    case 'addReminder':
      return { ...state, reminders: [action.reminder, ...state.reminders], quickAddOpen: false, announcement: `Reminder added: ${action.reminder.title}` }
    case 'removeBySource':
      return { ...state, reminders: state.reminders.filter(r => r.sourceEventId !== action.sourceEventId) }
    case 'setFilter':
      return { ...state, filter: action.filter }
    case 'setTab':
      return { ...state, tab: action.tab, segment: action.segment ?? null }
    case 'clearSegment':
      return state.segment === null ? state : { ...state, segment: null }
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
    case 'openUpgrade':
      return { ...state, tab: 'upgrade', upgradeFeature: action.feature, upgradeReturnTab: state.tab === 'upgrade' ? state.upgradeReturnTab : state.tab }
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
  addReminder: (reminder: Reminder) => void
  removeBySource: (sourceEventId: string) => void
  setFilter: (filter: Filter) => void
  setTab: (tab: Tab) => void
  openTab: (tab: Tab, segment?: string) => void
  clearSegment: () => void
  openSnooze: (id: string | null) => void
  setQuickAdd: (open: boolean) => void
  edit: (id: string, patch: Partial<Reminder>) => void
  remove: (id: string) => void
  openEdit: (id: string | null) => void
  openUpgrade: (feature?: Feature) => void
}

interface StoreValue {
  state: State
  derived: Derived
  actions: Actions
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  // Latest state for action creators: side effects (activity log) live here,
  // never in the reducer, which React may run twice in development.
  const stateRef = useRef(state)
  stateRef.current = state
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
  const prevReminders = useRef(state.reminders)
  useEffect(() => {
    if (!hydrated.current) return
    if (state.reminders === remindersStore.get()) return
    // Group reminders owned by others: my acknowledge/snooze goes to reminder_status.
    const before = new Map(prevReminders.current.map(r => [r.id, r]))
    for (const r of state.reminders) {
      const b = before.get(r.id)
      if (r.ownedByMe === false && b && (b.acknowledged !== r.acknowledged || b.snoozedUntil !== r.snoozedUntil)) void saveForeignStatus(r)
    }
    prevReminders.current = state.reminders
    remindersStore.set(state.reminders)
  }, [state.reminders])

  // Pick up reminders other group members added since we loaded.
  useEffect(() => {
    if (state.tab === 'today' || state.tab === 'calendar') void remindersStore.refresh()
  }, [state.tab])

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
      acknowledge: id => {
        const r = stateRef.current.reminders.find(x => x.id === id)
        if (r) logActivity('reminder.acknowledged', r.title, completionDetail(r), r.id)
        dispatch({ type: 'acknowledge', id })
      },
      acknowledgeMany: ids => {
        for (const r of stateRef.current.reminders) if (ids.includes(r.id)) logActivity('reminder.acknowledged', r.title, completionDetail(r), r.id)
        dispatch({ type: 'acknowledgeMany', ids })
      },
      snooze: (id, key) => {
        const r = stateRef.current.reminders.find(x => x.id === id)
        if (!r) return
        const until = snoozeUntil(key)
        logActivity('reminder.snoozed', r.title, `Snoozed ${snoozeLabel(until)}`, r.id)
        dispatch({ type: 'snooze', id, until })
      },
      unsnooze: id => dispatch({ type: 'unsnooze', id }),
      add: title => {
        if (!title.trim()) return
        // Killer feature: parse natural language into a scheduled, categorised reminder.
        const parsed = parseReminder(title)
        if (!parsed.title) return
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
        dispatch({ type: 'addReminder', reminder })
      },
      addReminder: reminder => {
        logActivity('reminder.added', reminder.title, reminder.meta, reminder.id)
        dispatch({ type: 'addReminder', reminder })
      },
      removeBySource: sourceEventId => dispatch({ type: 'removeBySource', sourceEventId }),
      setFilter: filter => dispatch({ type: 'setFilter', filter }),
      setTab: tab => dispatch({ type: 'setTab', tab }),
      openTab: (tab, segment) => dispatch({ type: 'setTab', tab, segment }),
      clearSegment: () => dispatch({ type: 'clearSegment' }),
      openSnooze: id => dispatch({ type: 'openSnooze', id }),
      setQuickAdd: open => dispatch({ type: 'setQuickAdd', open }),
      edit: (id, patch) => dispatch({ type: 'edit', id, patch }),
      remove: id => {
        const r = stateRef.current.reminders.find(x => x.id === id)
        if (r && r.ownedByMe !== false) logActivity('reminder.removed', r.title, undefined, r.id)
        dispatch({ type: 'remove', id })
      },
      openEdit: id => dispatch({ type: 'openEdit', id }),
      openUpgrade: feature => dispatch({ type: 'openUpgrade', feature: feature ?? null }),
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
