import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, ArrowLeft, CalendarRange, Link2, Lock, Plus, Trash2, Wand2 } from 'lucide-react'
import { cn } from '../lib/cn'
import { usePremium } from '../lib/useWorkspace'
import {
  addDays, conflictsOf, criticalPath, daysBetween, earliestStart,
  parseISO, planRange, taskDays, todayISO, usePlanner, wouldCycle,
  type Plan, type PlanKind,
} from '../lib/usePlanner'

const field =
  'w-full rounded-[12px] border border-[color:var(--glass-border)] bg-white/[0.08] px-3.5 py-2.5 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)] md:text-[0.85rem]'
const labelCls = 'mb-1.5 block text-[0.72rem] font-semibold text-[color:var(--ink-dim)]'
const primaryBtn =
  'cursor-pointer rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-4 py-2.5 text-[0.8rem] font-bold text-[#1a1240] transition hover:brightness-110'
const ghostBtn =
  'cursor-pointer rounded-full border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-2.5 text-[0.8rem] font-semibold text-[color:var(--ink-dim)] transition hover:text-white'

const fmtShort = (s: string) => new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short' }).format(parseISO(s))

export function PlannerView() {
  const { isPremium, setPremium } = usePremium()
  const { plans, createPlan, deletePlan } = usePlanner()
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<PlanKind>('event')
  const [description, setDescription] = useState('')

  if (!isPremium) {
    return (
      <div className="glass flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] text-[#1a1240]">
          <Lock size={20} />
        </span>
        <h3 className="font-display text-[1.15rem] font-bold">Event &amp; project planning</h3>
        <p className="max-w-md text-[0.85rem] leading-relaxed text-[color:var(--ink-dim)]">
          Break an event or project into tasks with start and end dates, link what depends on what, and see the whole
          thing as a Gantt chart. Available on Personal Plus and all business plans.
        </p>
        <button onClick={() => setPremium(true)} className={primaryBtn}>Unlock Premium</button>
      </div>
    )
  }

  const open = plans.find(p => p.id === openId)
  if (open) return <PlanDetail plan={open} onBack={() => setOpenId(null)} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[1.05rem] font-bold">Plans</h2>
          <p className="text-[0.78rem] text-[color:var(--ink-dim)]">Plan an event or run a project — tasks, dependencies and a Gantt chart.</p>
        </div>
        <button onClick={() => setCreating(v => !v)} className={cn(primaryBtn, 'flex items-center gap-1.5')}>
          <Plus size={15} /> New plan
        </button>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={e => {
              e.preventDefault()
              const id = createPlan(name, kind, description)
              if (id) {
                setName('')
                setDescription('')
                setCreating(false)
                setOpenId(id)
              }
            }}
            className="glass overflow-hidden"
          >
            <div className="flex flex-col gap-3 p-5">
              <div>
                <label className={labelCls}>Name</label>
                <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Product launch" required className={field} />
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <div className="flex gap-1.5">
                  {(['event', 'project'] as const).map(k => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={cn(
                        'flex-1 cursor-pointer rounded-full px-3 py-2 text-[0.8rem] font-semibold capitalize transition',
                        kind === k
                          ? 'bg-[color:var(--glass-strong)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                          : 'border border-[color:var(--glass-border)] bg-white/[0.06] text-[color:var(--ink-faint)]',
                      )}
                    >
                      {k === 'event' ? '🎉 Event' : '📊 Project'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Description (optional)</label>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this plan for?" className={field} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className={cn(primaryBtn, 'flex-1')}>Create plan</button>
                <button type="button" onClick={() => setCreating(false)} className={ghostBtn}>Cancel</button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {plans.length === 0 && !creating && (
        <div className="glass flex flex-col items-center gap-2 px-6 py-12 text-center">
          <CalendarRange size={32} className="text-[color:var(--ink-faint)]" />
          <h3 className="font-display text-[0.95rem] font-bold">No plans yet</h3>
          <p className="max-w-xs text-[0.8rem] text-[color:var(--ink-dim)]">Create a plan to break work into dated tasks and see them on a timeline.</p>
        </div>
      )}

      {plans.map(p => {
        const range = planRange(p.tasks)
        const issues = Object.keys(conflictsOf(p.tasks)).length
        const done = p.tasks.length ? Math.round(p.tasks.reduce((s, t) => s + t.progress, 0) / p.tasks.length) : 0
        return (
          <div key={p.id} className="glass flex items-center gap-3.5 px-[18px] py-4">
            <button onClick={() => setOpenId(p.id)} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-base">
                {p.kind === 'event' ? '🎉' : '📊'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[0.92rem] font-bold">{p.name}</span>
                  {issues > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-[rgba(255,107,107,0.18)] px-2 py-[1px] text-[0.6rem] font-extrabold uppercase text-[#FFB4B4]">
                      <AlertTriangle size={9} /> {issues}
                    </span>
                  )}
                </span>
                <span className="block truncate text-[0.74rem] text-[color:var(--ink-faint)]">
                  {p.tasks.length} task{p.tasks.length === 1 ? '' : 's'} · {done}% done
                  {p.tasks.length > 0 && ` · ${fmtShort(range.start)} – ${fmtShort(range.end)}`}
                </span>
              </span>
            </button>
            <button onClick={() => deletePlan(p.id)} aria-label={`Delete ${p.name}`} className="shrink-0 cursor-pointer text-[color:var(--ink-faint)] transition hover:text-[color:var(--red)]">
              <Trash2 size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
function PlanDetail({ plan, onBack }: { plan: Plan; onBack: () => void }) {
  const { addTask, updateTask, deleteTask, toggleDependency, autoSchedule } = usePlanner()
  const [name, setName] = useState('')
  const [start, setStart] = useState(todayISO())
  const [end, setEnd] = useState(addDays(todayISO(), 2))
  const [linkFor, setLinkFor] = useState<string | null>(null)

  const conflicts = useMemo(() => conflictsOf(plan.tasks), [plan.tasks])
  const critical = useMemo(() => criticalPath(plan.tasks), [plan.tasks])
  const range = useMemo(() => planRange(plan.tasks), [plan.tasks])
  const conflictCount = Object.keys(conflicts).length

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex w-fit cursor-pointer items-center gap-1.5 text-[0.8rem] font-semibold text-[color:var(--ink-dim)] transition hover:text-white">
        <ArrowLeft size={15} /> All plans
      </button>

      <div className="glass flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h2 className="font-display text-[1.25rem] font-bold">
            {plan.kind === 'event' ? '🎉' : '📊'} {plan.name}
          </h2>
          {plan.description && <p className="mt-1 text-[0.82rem] text-[color:var(--ink-dim)]">{plan.description}</p>}
          <p className="mt-1 text-[0.74rem] text-[color:var(--ink-faint)]">
            {plan.tasks.length} tasks · {fmtShort(range.start)} – {fmtShort(range.end)} · {range.days} days
          </p>
        </div>
        {conflictCount > 0 && (
          <button onClick={() => autoSchedule(plan.id)} className={cn(primaryBtn, 'flex items-center gap-1.5')}>
            <Wand2 size={14} /> Fix {conflictCount} conflict{conflictCount === 1 ? '' : 's'}
          </button>
        )}
      </div>

      <Gantt plan={plan} range={range} critical={critical} conflicts={conflicts} />

      <div className="flex flex-col gap-2">
        {plan.tasks.map(t => {
          const conflict = conflicts[t.id]
          const earliest = earliestStart(t, plan.tasks)
          return (
            <div key={t.id} className="glass flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: t.color }} />
                <input
                  value={t.name}
                  onChange={e => updateTask(plan.id, t.id, { name: e.target.value })}
                  className="min-w-0 flex-1 bg-transparent text-[0.9rem] font-bold text-white outline-none"
                  aria-label="Task name"
                />
                {critical.has(t.id) && (
                  <span className="rounded-full bg-[rgba(255,107,107,0.16)] px-2 py-[1px] text-[0.58rem] font-extrabold uppercase tracking-[0.05em] text-[#FFB4B4]">
                    Critical
                  </span>
                )}
                <button
                  onClick={() => setLinkFor(linkFor === t.id ? null : t.id)}
                  title="Dependencies"
                  className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-[color:var(--glass-border)] bg-white/[0.06] px-2.5 py-1 text-[0.68rem] font-semibold text-[color:var(--ink-dim)] transition hover:text-white"
                >
                  <Link2 size={12} /> {t.dependsOn.length || 'Link'}
                </button>
                <button onClick={() => deleteTask(plan.id, t.id)} aria-label={`Delete ${t.name}`} className="shrink-0 cursor-pointer text-[color:var(--ink-faint)] transition hover:text-[color:var(--red)]">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[0.72rem]">
                <input
                  type="date" value={t.start} onChange={e => updateTask(plan.id, t.id, { start: e.target.value })}
                  aria-label="Start date"
                  className="rounded-[9px] border border-[color:var(--glass-border)] bg-white/[0.08] px-2 py-1 text-white outline-none"
                />
                <span className="text-[color:var(--ink-faint)]">→</span>
                <input
                  type="date" value={t.end} min={t.start} onChange={e => updateTask(plan.id, t.id, { end: e.target.value })}
                  aria-label="End date"
                  className="rounded-[9px] border border-[color:var(--glass-border)] bg-white/[0.08] px-2 py-1 text-white outline-none"
                />
                <span className="text-[color:var(--ink-faint)]">{taskDays(t)}d</span>
                <label className="ml-auto flex items-center gap-1.5 text-[color:var(--ink-dim)]">
                  {t.progress}%
                  <input
                    type="range" min={0} max={100} step={10} value={t.progress}
                    onChange={e => updateTask(plan.id, t.id, { progress: Number(e.target.value) })}
                    aria-label={`${t.name} progress`}
                    className="w-24 accent-[color:var(--cyan)]"
                  />
                </label>
              </div>

              {conflict && (
                <p className="flex items-start gap-1.5 text-[0.72rem] text-[#FCD770]">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {conflict}
                </p>
              )}
              {!conflict && earliest && (
                <p className="text-[0.68rem] text-[color:var(--ink-faint)]">
                  Waits on {t.dependsOn.map(id => plan.tasks.find(x => x.id === id)?.name).filter(Boolean).join(', ')}
                </p>
              )}

              <AnimatePresence>
                {linkFor === t.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="border-t border-white/10 pt-2">
                      <p className="mb-1.5 text-[0.7rem] font-semibold text-[color:var(--ink-dim)]">Must finish before this task starts:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.tasks.filter(o => o.id !== t.id).length === 0 && (
                          <span className="text-[0.72rem] text-[color:var(--ink-faint)]">Add another task first.</span>
                        )}
                        {plan.tasks
                          .filter(o => o.id !== t.id)
                          .map(o => {
                            const on = t.dependsOn.includes(o.id)
                            const blocked = !on && wouldCycle(t.id, o.id, plan.tasks)
                            return (
                              <button
                                key={o.id}
                                onClick={() => !blocked && toggleDependency(plan.id, t.id, o.id)}
                                disabled={blocked}
                                title={blocked ? 'That would create a circular dependency' : undefined}
                                className={cn(
                                  'cursor-pointer rounded-full px-2.5 py-1 text-[0.7rem] font-semibold transition',
                                  on
                                    ? 'bg-[linear-gradient(135deg,var(--cyan),var(--violet))] text-[#1a1240]'
                                    : blocked
                                      ? 'cursor-not-allowed border border-[color:var(--glass-border)] bg-white/[0.04] text-[color:var(--ink-faint)] opacity-50'
                                      : 'border border-[color:var(--glass-border)] bg-white/[0.06] text-[color:var(--ink-dim)] hover:text-white',
                                )}
                              >
                                {on && '✓ '}
                                {o.name}
                              </button>
                            )
                          })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      <form
        onSubmit={e => {
          e.preventDefault()
          addTask(plan.id, name, start, end)
          setName('')
        }}
        className="glass flex flex-col gap-3 p-5"
      >
        <h3 className="font-display text-[0.9rem] font-bold">Add a task</h3>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Task name" required className={field} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[130px] flex-1">
            <label className={labelCls}>Starts</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} className={field} />
          </div>
          <div className="min-w-[130px] flex-1">
            <label className={labelCls}>Ends</label>
            <input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} className={field} />
          </div>
          <button type="submit" className={cn(primaryBtn, 'flex items-center gap-1.5')}>
            <Plus size={15} /> Add
          </button>
        </div>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
/** Horizontal Gantt: one row per task, a day-column header, and today marked. */
function Gantt({
  plan,
  range,
  critical,
  conflicts,
}: {
  plan: Plan
  range: { start: string; end: string; days: number }
  critical: Set<string>
  conflicts: Record<string, string>
}) {
  const COL = 34 // px per day
  const today = todayISO()
  const todayIdx = daysBetween(range.start, today)

  if (plan.tasks.length === 0) {
    return (
      <div className="glass flex flex-col items-center gap-2 px-6 py-10 text-center">
        <CalendarRange size={28} className="text-[color:var(--ink-faint)]" />
        <p className="text-[0.85rem] font-semibold">No tasks yet</p>
        <p className="max-w-xs text-[0.78rem] text-[color:var(--ink-dim)]">Add your first task below and it will appear on the timeline.</p>
      </div>
    )
  }

  const days = Array.from({ length: range.days }, (_, i) => addDays(range.start, i))

  return (
    <div className="glass overflow-hidden">
      <div className="scroll-thin overflow-x-auto">
        <div style={{ minWidth: range.days * COL + 180 }}>
          <div className="flex border-b border-white/10">
            <div className="sticky left-0 z-10 w-[180px] shrink-0 bg-[rgba(40,30,86,0.95)] px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.06em] text-[color:var(--ink-faint)]">
              Task
            </div>
            {days.map((d, i) => {
              const dt = parseISO(d)
              const weekend = dt.getDay() === 0 || dt.getDay() === 6
              const isToday = d === today
              return (
                <div
                  key={d}
                  style={{ width: COL }}
                  className={cn(
                    'shrink-0 py-2 text-center text-[0.6rem] leading-tight',
                    weekend && 'bg-white/[0.04]',
                    isToday ? 'font-extrabold text-[color:var(--cyan)]' : 'text-[color:var(--ink-faint)]',
                  )}
                >
                  <div>{new Intl.DateTimeFormat('en-NZ', { weekday: 'narrow' }).format(dt)}</div>
                  <div>{dt.getDate()}</div>
                  {i === 0 || dt.getDate() === 1 ? (
                    <div className="text-[0.52rem] uppercase">{new Intl.DateTimeFormat('en-NZ', { month: 'short' }).format(dt)}</div>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="relative">
            {todayIdx >= 0 && todayIdx < range.days && (
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-0 top-0 z-[5] w-[2px] bg-[color:var(--cyan)] opacity-70"
                style={{ left: 180 + todayIdx * COL + COL / 2 }}
              />
            )}
            {plan.tasks.map(t => {
              const offset = daysBetween(range.start, t.start)
              const span = taskDays(t)
              const isCritical = critical.has(t.id)
              const hasConflict = Boolean(conflicts[t.id])
              return (
                <div key={t.id} className="flex items-center border-b border-white/[0.06] last:border-0">
                  <div className="sticky left-0 z-10 w-[180px] shrink-0 truncate bg-[rgba(40,30,86,0.95)] px-3 py-2.5 text-[0.78rem] font-semibold">
                    {t.name}
                  </div>
                  <div className="relative flex-1" style={{ height: 40 }}>
                    <div
                      className={cn(
                        'absolute top-1/2 flex -translate-y-1/2 items-center overflow-hidden rounded-full',
                        hasConflict && 'ring-1 ring-[color:var(--red)]',
                      )}
                      style={{
                        left: offset * COL + 3,
                        width: Math.max(span * COL - 6, 16),
                        height: 22,
                        background: `${t.color}44`,
                        border: `1px solid ${t.color}`,
                      }}
                      title={`${t.name} · ${fmtShort(t.start)} – ${fmtShort(t.end)} · ${t.progress}%`}
                    >
                      <div className="h-full" style={{ width: `${t.progress}%`, background: t.color }} />
                      {span > 2 && (
                        <span className="absolute inset-0 flex items-center px-2 text-[0.62rem] font-bold text-white">{t.progress}%</span>
                      )}
                      {isCritical && <span className="absolute right-1 text-[0.6rem]">🔥</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-white/10 px-4 py-2.5 text-[0.66rem] text-[color:var(--ink-faint)]">
        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-[color:var(--violet)]" /> Task (filled = progress)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-[2px] bg-[color:var(--cyan)]" /> Today</span>
        <span className="flex items-center gap-1.5">🔥 Critical path</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full ring-1 ring-[color:var(--red)]" /> Conflict</span>
      </div>
    </div>
  )
}
