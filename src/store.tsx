/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'
import { seedReminders } from './data'
import type { Filter, Reminder, Tab, ToggleKey } from './types'

interface State {
  reminders: Reminder[]
  filter: Filter
  tab: Tab
  toggles: Record<ToggleKey, boolean>
  completedBefore: number
  snoozeTargetId: string | null
  quickAddOpen: boolean
  announcement: string
}

type Action =
  | { type: 'acknowledge'; id: string }
  | { type: 'acknowledgeMany'; ids: string[] }
  | { type: 'snooze'; id: string; label: string }
  | { type: 'add'; title: string }
  | { type: 'setFilter'; filter: Filter }
  | { type: 'setTab'; tab: Tab }
  | { type: 'toggle'; key: ToggleKey }
  | { type: 'openSnooze'; id: string | null }
  | { type: 'setQuickAdd'; open: boolean }

const initialState: State = {
  reminders: seedReminders,
  filter: 'today',
  tab: 'today',
  toggles: { personalAlarm: true, push: true, email: true, sms: false, slack: true, quietHours: true },
  completedBefore: 4,
  snoozeTargetId: null,
  quickAddOpen: false,
  announcement: '',
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'acknowledge': {
      const target = state.reminders.find(r => r.id === action.id)
      return {
        ...state,
        reminders: state.reminders.map(r => (r.id === action.id ? { ...r, acknowledged: true } : r)),
        announcement: target ? `${target.title} acknowledged` : state.announcement,
      }
    }
    case 'acknowledgeMany':
      return {
        ...state,
        reminders: state.reminders.map(r => (action.ids.includes(r.id) ? { ...r, acknowledged: true } : r)),
        announcement: 'All reminders acknowledged',
      }
    case 'snooze': {
      const target = state.reminders.find(r => r.id === action.id)
      return {
        ...state,
        reminders: state.reminders.map(r => (r.id === action.id ? { ...r, snoozedUntil: action.label } : r)),
        snoozeTargetId: null,
        announcement: target ? `${target.title} snoozed — ${action.label}` : state.announcement,
      }
    }
    case 'add': {
      const title = action.title.trim()
      if (!title) return state
      const reminder: Reminder = {
        id: `r-${Date.now()}`,
        title,
        meta: 'Personal · Today · added via quick add',
        category: 'personal',
        icon: '✨',
        dayOffset: 0,
        acknowledged: false,
      }
      return { ...state, reminders: [reminder, ...state.reminders], quickAddOpen: false, announcement: `Reminder added: ${title}` }
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
  }
}

export interface Derived {
  active: Reminder[]
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
  snooze: (id: string, label: string) => void
  add: (title: string) => void
  setFilter: (filter: Filter) => void
  setTab: (tab: Tab) => void
  toggle: (key: ToggleKey) => void
  openSnooze: (id: string | null) => void
  setQuickAdd: (open: boolean) => void
}

interface StoreValue {
  state: State
  derived: Derived
  actions: Actions
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const derived = useMemo<Derived>(() => {
    const active = state.reminders.filter(r => !r.acknowledged && !r.snoozedUntil)
    const counts = {
      today: active.filter(r => r.dayOffset === 0).length,
      tomorrow: active.filter(r => r.dayOffset === 1).length,
      week: active.filter(r => r.dayOffset >= 0 && r.dayOffset <= 6).length,
      overdue: active.filter(r => r.dayOffset < 0).length,
    }
    const todayAll = state.reminders.filter(r => r.dayOffset === 0 && !r.snoozedUntil)
    const total = state.completedBefore + todayAll.length
    const done = state.completedBefore + todayAll.filter(r => r.acknowledged).length
    const nextUp =
      active
        .filter(r => r.dayOffset === 0 && r.time)
        .sort((a, b) => timeMinutes(a.time) - timeMinutes(b.time))[0] ?? null
    return {
      active,
      counts,
      done,
      total,
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
      compliancePending: active.filter(r => r.category === 'compliance' && r.dayOffset === 0).length,
      nextUp,
    }
  }, [state.reminders, state.completedBefore])

  const actions = useMemo<Actions>(
    () => ({
      acknowledge: id => dispatch({ type: 'acknowledge', id }),
      acknowledgeMany: ids => dispatch({ type: 'acknowledgeMany', ids }),
      snooze: (id, label) => dispatch({ type: 'snooze', id, label }),
      add: title => dispatch({ type: 'add', title }),
      setFilter: filter => dispatch({ type: 'setFilter', filter }),
      setTab: tab => dispatch({ type: 'setTab', tab }),
      toggle: key => dispatch({ type: 'toggle', key }),
      openSnooze: id => dispatch({ type: 'openSnooze', id }),
      setQuickAdd: open => dispatch({ type: 'setQuickAdd', open }),
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
