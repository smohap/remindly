import { useState } from 'react'
import { useStore } from '../store'
import { BottomSheet } from './BottomSheet'
import { SnoozeOptions } from './SnoozeOptions'

function QuickAddForm() {
  const { actions } = useStore()
  const [text, setText] = useState('')
  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        actions.add(text)
        setText('')
      }}
    >
      <h3 className="font-display mb-3 text-base font-bold">New reminder</h3>
      <input
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Remind me to…"
        className="w-full rounded-[14px] border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-3 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)]"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {['tomorrow 9am', 'every Monday', 'in 1 hour'].map(chip => (
          <button
            key={chip}
            type="button"
            onClick={() => setText(t => (t ? `${t} ${chip}` : `Remind me ${chip} — `))}
            className="cursor-pointer rounded-full border border-[color:var(--glass-border)] bg-white/[0.08] px-3 py-1.5 text-[0.72rem] font-semibold text-[color:var(--ink-dim)]"
          >
            {chip}
          </button>
        ))}
      </div>
      <button
        type="submit"
        className="mt-4 w-full cursor-pointer rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] py-3 text-[0.85rem] font-bold text-[#1a1240]"
      >
        Add reminder
      </button>
    </form>
  )
}

/** Edit or delete a reminder you created. */
function EditReminderForm({ id }: { id: string }) {
  const { state, actions } = useStore()
  const reminder = state.reminders.find(r => r.id === id)
  const [title, setTitle] = useState(reminder?.title ?? '')
  const [time, setTime] = useState(reminder?.time ?? '')
  const [dayOffset, setDayOffset] = useState(String(reminder?.dayOffset ?? 0))
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (!reminder) return null

  const field =
    'w-full rounded-[12px] border border-[color:var(--glass-border)] bg-white/[0.08] px-3.5 py-2.5 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)] md:text-[0.85rem]'
  const labelCls = 'mb-1.5 block text-[0.72rem] font-semibold text-[color:var(--ink-dim)]'

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        actions.edit(id, {
          title: title.trim() || reminder.title,
          time: time.trim() || undefined,
          dayOffset: Number(dayOffset),
        })
      }}
    >
      <h3 className="font-display mb-3 text-base font-bold">Edit reminder</h3>

      <label className={labelCls}>Title</label>
      <input value={title} onChange={e => setTitle(e.target.value)} className={field} autoFocus />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>When</label>
          <select value={dayOffset} onChange={e => setDayOffset(e.target.value)} className={field}>
            <option value="-1" className="bg-[color:var(--indigo)]">Yesterday</option>
            <option value="0" className="bg-[color:var(--indigo)]">Today</option>
            <option value="1" className="bg-[color:var(--indigo)]">Tomorrow</option>
            <option value="2" className="bg-[color:var(--indigo)]">In 2 days</option>
            <option value="7" className="bg-[color:var(--indigo)]">In a week</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Time</label>
          <input value={time} onChange={e => setTime(e.target.value)} placeholder="e.g. 5:00 PM" className={field} />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button type="submit" className="flex-1 cursor-pointer rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] py-3 text-[0.85rem] font-bold text-[#1a1240]">
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
        <QuickAddForm />
      </BottomSheet>

      <BottomSheet open={state.editTargetId !== null} onClose={() => actions.openEdit(null)} label="Edit reminder">
        {state.editTargetId && <EditReminderForm id={state.editTargetId} />}
      </BottomSheet>
      <BottomSheet open={target !== null} onClose={() => actions.openSnooze(null)} label="Snooze options">
        {target && (
          <>
            <h3 className="font-display mb-1 text-base font-bold">Snooze</h3>
            <p className="mb-3 text-[0.8rem] text-[color:var(--ink-dim)]">{target.title}</p>
            <SnoozeOptions reminder={target} onPick={label => actions.snooze(target.id, label)} />
          </>
        )}
      </BottomSheet>
    </>
  )
}
