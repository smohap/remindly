import { useCallback, useSyncExternalStore } from 'react'
import { makeStore } from './localStore'

/**
 * Event and project planning: a plan holds tasks with start/end dates and
 * finish-to-start dependencies, rendered as a Gantt chart.
 */

export type PlanKind = 'event' | 'project'

export interface PlanTask {
  id: string
  name: string
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD
  progress: number // 0-100
  dependsOn: string[] // task ids that must finish first
  assignee?: string
  color: string
}

export interface Plan {
  id: string
  name: string
  kind: PlanKind
  description?: string
  tasks: PlanTask[]
  createdAt: string
}

export const TASK_COLORS = ['#7C6FFF', '#4FD1FF', '#2DD4BF', '#FBBF24', '#FF6FB0', '#FF6B6B']

const DAY = 86400000

export const iso = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1)
  dt.setHours(0, 0, 0, 0)
  return dt
}
export const addDays = (s: string, n: number) => iso(new Date(parseISO(s).getTime() + n * DAY))
export const daysBetween = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / DAY)
export const todayISO = () => iso(new Date())

/** Inclusive duration in days. */
export const taskDays = (t: PlanTask) => Math.max(1, daysBetween(t.start, t.end) + 1)

function seedPlans(): Plan[] {
  const t = todayISO()
  return [
    {
      id: 'p1',
      name: 'Wellington Rugby — season launch',
      kind: 'event',
      description: 'Everything that has to happen before opening day.',
      createdAt: new Date().toISOString(),
      tasks: [
        { id: 't1', name: 'Book the venue', start: t, end: addDays(t, 3), progress: 100, dependsOn: [], assignee: 'Priya', color: '#7C6FFF' },
        { id: 't2', name: 'Confirm catering', start: addDays(t, 4), end: addDays(t, 7), progress: 60, dependsOn: ['t1'], assignee: 'Tama', color: '#4FD1FF' },
        { id: 't3', name: 'Send invitations', start: addDays(t, 4), end: addDays(t, 9), progress: 30, dependsOn: ['t1'], assignee: 'Sione', color: '#2DD4BF' },
        { id: 't4', name: 'Print programmes', start: addDays(t, 8), end: addDays(t, 11), progress: 0, dependsOn: ['t2', 't3'], color: '#FBBF24' },
        { id: 't5', name: 'Opening day', start: addDays(t, 12), end: addDays(t, 12), progress: 0, dependsOn: ['t4'], color: '#FF6FB0' },
      ],
    },
  ]
}

const store = makeStore<Plan[]>('remindly.plans.v1', seedPlans())

/**
 * Earliest legal start for a task: the day after every dependency finishes.
 * Returns null when the task has no dependencies.
 */
export function earliestStart(task: PlanTask, all: PlanTask[]): string | null {
  const deps = task.dependsOn.map(id => all.find(t => t.id === id)).filter(Boolean) as PlanTask[]
  if (deps.length === 0) return null
  const latestEnd = deps.reduce((acc, d) => (parseISO(d.end) > parseISO(acc) ? d.end : acc), deps[0].end)
  return addDays(latestEnd, 1)
}

/** A task that starts before its dependencies finish is a scheduling conflict. */
export function conflictsOf(tasks: PlanTask[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const t of tasks) {
    const earliest = earliestStart(t, tasks)
    if (earliest && parseISO(t.start) < parseISO(earliest)) {
      const blockers = t.dependsOn
        .map(id => tasks.find(x => x.id === id)?.name)
        .filter(Boolean)
        .join(', ')
      out[t.id] = `Starts before ${blockers} finishes — earliest is ${earliest}`
    }
  }
  return out
}

/** Would adding dep -> task create a dependency cycle? */
export function wouldCycle(taskId: string, depId: string, tasks: PlanTask[]): boolean {
  if (taskId === depId) return true
  const seen = new Set<string>()
  const walk = (id: string): boolean => {
    if (id === taskId) return true
    if (seen.has(id)) return false
    seen.add(id)
    const t = tasks.find(x => x.id === id)
    return (t?.dependsOn ?? []).some(walk)
  }
  return walk(depId)
}

/** Full date span covered by a plan, padded a little for readability. */
export function planRange(tasks: PlanTask[]): { start: string; end: string; days: number } {
  if (tasks.length === 0) {
    const s = todayISO()
    return { start: s, end: addDays(s, 13), days: 14 }
  }
  let start = tasks[0].start
  let end = tasks[0].end
  for (const t of tasks) {
    if (parseISO(t.start) < parseISO(start)) start = t.start
    if (parseISO(t.end) > parseISO(end)) end = t.end
  }
  start = addDays(start, -1)
  end = addDays(end, 1)
  return { start, end, days: daysBetween(start, end) + 1 }
}

/** Longest dependency chain — the tasks that decide the finish date. */
export function criticalPath(tasks: PlanTask[]): Set<string> {
  const memo = new Map<string, number>()
  const cost = (id: string): number => {
    const cached = memo.get(id)
    if (cached !== undefined) return cached
    const t = tasks.find(x => x.id === id)
    if (!t) return 0
    memo.set(id, 0) // guard against cycles while recursing
    const best = t.dependsOn.length ? Math.max(...t.dependsOn.map(cost)) : 0
    const total = taskDays(t) + best
    memo.set(id, total)
    return total
  }
  let endId: string | null = null
  let best = -1
  for (const t of tasks) {
    const c = cost(t.id)
    if (c > best) {
      best = c
      endId = t.id
    }
  }
  const path = new Set<string>()
  let cur = endId
  while (cur) {
    path.add(cur)
    const t = tasks.find(x => x.id === cur)
    if (!t || t.dependsOn.length === 0) break
    cur = t.dependsOn.reduce((a, b) => (cost(a) >= cost(b) ? a : b))
    if (path.has(cur)) break
  }
  return path
}

export function usePlanner() {
  const plans = useSyncExternalStore(store.subscribe, store.get, store.get)

  const createPlan = useCallback((name: string, kind: PlanKind, description?: string) => {
    const trimmed = name.trim()
    if (!trimmed) return null
    const plan: Plan = {
      id: `pl-${Date.now()}`,
      name: trimmed,
      kind,
      description: description?.trim() || undefined,
      tasks: [],
      createdAt: new Date().toISOString(),
    }
    store.set([plan, ...store.get()])
    return plan.id
  }, [])

  const deletePlan = useCallback((id: string) => {
    store.set(store.get().filter(p => p.id !== id))
  }, [])

  const patchPlan = (id: string, fn: (p: Plan) => Plan) => {
    store.set(store.get().map(p => (p.id === id ? fn(p) : p)))
  }

  const addTask = useCallback((planId: string, name: string, start: string, end: string) => {
    const n = name.trim()
    if (!n) return
    patchPlan(planId, p => ({
      ...p,
      tasks: [
        ...p.tasks,
        {
          id: `tk-${Date.now()}`,
          name: n,
          start,
          end: parseISO(end) < parseISO(start) ? start : end,
          progress: 0,
          dependsOn: [],
          color: TASK_COLORS[p.tasks.length % TASK_COLORS.length],
        },
      ],
    }))
  }, [])

  const updateTask = useCallback((planId: string, taskId: string, patch: Partial<PlanTask>) => {
    patchPlan(planId, p => ({
      ...p,
      tasks: p.tasks.map(t => {
        if (t.id !== taskId) return t
        const next = { ...t, ...patch }
        if (parseISO(next.end) < parseISO(next.start)) next.end = next.start
        return next
      }),
    }))
  }, [])

  const deleteTask = useCallback((planId: string, taskId: string) => {
    patchPlan(planId, p => ({
      ...p,
      tasks: p.tasks.filter(t => t.id !== taskId).map(t => ({ ...t, dependsOn: t.dependsOn.filter(d => d !== taskId) })),
    }))
  }, [])

  const toggleDependency = useCallback((planId: string, taskId: string, depId: string) => {
    patchPlan(planId, p => ({
      ...p,
      tasks: p.tasks.map(t => {
        if (t.id !== taskId) return t
        const has = t.dependsOn.includes(depId)
        if (!has && wouldCycle(taskId, depId, p.tasks)) return t // refuse cycles
        return { ...t, dependsOn: has ? t.dependsOn.filter(d => d !== depId) : [...t.dependsOn, depId] }
      }),
    }))
  }, [])

  /** Push each task to its earliest legal start, settling chains in order. */
  const autoSchedule = useCallback((planId: string) => {
    patchPlan(planId, p => {
      const tasks = [...p.tasks]
      for (let pass = 0; pass <= tasks.length; pass++) {
        let moved = false
        for (let i = 0; i < tasks.length; i++) {
          const t = tasks[i]
          const earliest = earliestStart(t, tasks)
          if (earliest && parseISO(t.start) < parseISO(earliest)) {
            const span = taskDays(t) - 1
            tasks[i] = { ...t, start: earliest, end: addDays(earliest, span) }
            moved = true
          }
        }
        if (!moved) break
      }
      return { ...p, tasks }
    })
  }, [])

  return { plans, createPlan, deletePlan, addTask, updateTask, deleteTask, toggleDependency, autoSchedule }
}
