import { useState } from 'react'
import { cn } from '../lib/cn'
import { buildReminder, normaliseTime } from '../lib/newReminder'
import { RECURRENCES, type Recurrence } from '../lib/recurrence'
import type { Category } from '../types'
import { useStore } from '../store'
import { BottomSheet } from './BottomSheet'
import { DatePicker } from './DatePicker'
import { SnoozeOptions } from './SnoozeOptions'

const FIELD =
  'w-full rounded-[12px] border border-[color:var(--border-strong)] bg-white/[0.08] px-3.5 py-2.5 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] md:text-[0.85rem]'
const LABEL = 'mb-1.5 block text-[0.72rem] font-semibold text-[color:var(--ink-dim)]'

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'group', label: 'Group' },
  { value: 'compliance', label: 'Compliance' },
]

function RepeatSelect({ value, onChange }: { value: Recurrence | ''; onChange: (r: Recurrence | '') => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as Recurrence | '')} className={FIELD}>
      <option value="" className="bg-[color:var(--surface-2)]">Does not repeat</option>
      {RECURRENCES.map(r => (
        <option key={r.value} value={r.value} className="bg-[color:var(--surface-2)]">{r.label}</option>
      ))}
    </select>
  )
}

/**
 * Structured "New reminder" form, opened by the + button (desktop top bar
 * and mobile FAB). The natural-language bar is the other way in.
 */
function NewReminderForm() {
  const { actions } = useStore()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [time, setTime] = useState('')
  const [recurrence, setRecurrence] = useState<Recurrence | ''>('')
  const [category, setCategory] = useState<Category>('personal')
  const [error, setError] = useState<string | null>(null)

  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        if (time.trim() && !normaliseTime(time)) {
          setError('Time should look like "5pm" or "17:00".')
          return
        }
        const r = buildReminder({ title, date: iso, time, recurrence: recurrence || undefined, category })
        if (!r) {
          setError('Give the reminder a title.')
          return
        }
        actions.addReminder(r)
      }}
    >
      <h3 className="font-display mb-3 text-base font-bold">New reminder</h3>

      <label className={LABEL}>Title</label>
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="What do you need to remember?" className={FIELD} />

      <div className="mt-3">
        <label className={LABEL}>
          Date — <span className="text-white">{new Intl.DateTimeFormat('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)}</span>
        </label>
        <DatePicker value={date} onChange={setDate} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Time</label>
          <input value={time} onChange={e => setTime(e.target.value)} placeholder="e.g. 5pm — blank for all day" className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Repeat</label>
          <RepeatSelect value={recurrence} onChange={setRecurrence} />
        </div>
      </div>

      <div className="mt-3">
        <label className={LABEL}>Category</label>
        <div className="flex gap-1.5">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              aria-pressed={category === c.value}
              className={cn('rounded-[10px] px-3 py-1.5 text-[0.78rem] font-semibold transition', category === c.value ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]' : 'bg-white/[0.06] text-[color:var(--ink-dim)] hover:text-white')}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-3 text-[0.78rem] text-[color:var(--danger)]">{error}</p>}

      <button type="submit" className="mt-4 w-full cursor-pointer rounded-full bg-[color:var(--accent)] py-3 text-[0.85rem] font-bold text-white">
        Add reminder
      </button>
      <p className="mt-2 text-center text-[0.7rem] text-[color:var(--ink-faint)]">Or type it naturally in the bar at the top — "gym every weekday at 6am".</p>
    </form>
  )
}

/** Edit or delete a reminder you created. */
function EditReminderForm({ id }: { id: string }) {
  const { state, actions } = useStore()
  const reminder = state.reminders.find(r => r.id === id)
  const [title, setTitle] = useState(reminder?.title ?? '')
  const [time, setTime] = useState(reminder?.time ?? '')
  const [recurrence, setRecurrence] = useState<Recurrence | ''>(reminder?.recurrence ?? '')
  const [date, setDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + (reminder?.dayOffset ?? 0))
    return d
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (!reminder) return null

  /** Whole days between today and the picked date. */
  const offsetOf = (d: Date) => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return Math.round((d.getTime() - t.getTime()) / 86400000)
  }

  const field =
    'w-full rounded-[12px] border border-[color:var(--border-strong)] bg-white/[0.08] px-3.5 py-2.5 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] md:text-[0.85rem]'
  const labelCls = 'mb-1.5 block text-[0.72rem] font-semibold text-[color:var(--ink-dim)]'

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        actions.edit(id, {
          title: title.trim() || reminder.title,
          time: normaliseTime(time) ?? undefined,
          dayOffset: offsetOf(date),
          recurrence: recurrence || undefined,
        })
      }}
    >
      <h3 className="font-display mb-3 text-base font-bold">Edit reminder</h3>

      <label className={labelCls}>Title</label>
      <input value={title} onChange={e => setTitle(e.target.value)} className={field} autoFocus />

      <div className="mt-3">
        <label className={labelCls}>
          Date — <span className="text-white">{new Intl.DateTimeFormat('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)}</span>
        </label>
        <DatePicker value={date} onChange={setDate} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Time</label>
          <input value={time} onChange={e => setTime(e.target.value)} placeholder="e.g. 5:00 PM — leave blank for all day" className={field} />
        </div>
        <div>
          <label className={labelCls}>Repeat</label>
          <RepeatSelect value={recurrence} onChange={setRecurrence} />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button type="submit" className="flex-1 cursor-pointer rounded-full bg-[color:var(--accent)] py-3 text-[0.85rem] font-bold text-white">
          Save changes
        </button>
        <button
          type="button"
          onClick={() => (confirmDelete ? actions.remove(id) : setConfirmDelete(true))}
          className="cursor-pointer rounded-full border border-[rgba(255,107,107,0.45)] bg-white/[0.06] px-4 py-3 text-[0.82rem] font-semibold text-[color:var(--red)] transition hover:bg-[rgba(255,107,107,0.14)]"
        >
          {confirmDelete ? 'Tap again to delete' : 'Delete'}
        </button>
      </div>
    </form>
  )
}

export function GlobalSheets() {
  const { state, actions } = useStore()
  const target = state.reminders.find(r => r.id === state.snoozeTargetId) ?? null
  return (
    <>
      <BottomSheet open={state.quickAddOpen} onClose={() => actions.setQuickAdd(false)} label="Add a reminder">
        <NewReminderForm />
      </BottomSheet>

      <BottomSheet open={state.editTargetId !== null} onClose={() => actions.openEdit(null)} label="Edit reminder">
        {state.editTargetId && <EditReminderForm id={state.editTargetId} />}
      </BottomSheet>
      <BottomSheet open={target !== null} onClose={() => actions.openSnooze(null)} label="Snooze options">
        {target && (
          <>
            <h3 className="font-display mb-1 text-base font-bold">Snooze</h3>
            <p className="mb-3 text-[0.8rem] text-[color:var(--ink-dim)]">{target.title}</p>
            <SnoozeOptions reminder={target} onPick={key => actions.snooze(target.id, key)} />
          </>
        )}
      </BottomSheet>
    </>
  )
}
