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

export function GlobalSheets() {
  const { state, actions } = useStore()
  const target = state.reminders.find(r => r.id === state.snoozeTargetId) ?? null
  return (
    <>
      <BottomSheet open={state.quickAddOpen} onClose={() => actions.setQuickAdd(false)} label="Add a reminder">
        <QuickAddForm />
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
