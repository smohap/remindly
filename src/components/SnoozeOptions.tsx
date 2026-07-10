import type { Reminder } from '../types'

const OPTIONS = ['5 minutes', '15 minutes', '30 minutes', '1 hour', 'Tomorrow']

export function SnoozeOptions({ reminder, onPick }: { reminder: Reminder; onPick: (label: string) => void }) {
  return (
    <div className="flex flex-col">
      {OPTIONS.map(option => (
        <button
          key={option}
          onClick={() => onPick(option)}
          className="cursor-pointer rounded-[10px] px-3 py-2.5 text-left text-[0.8rem] font-semibold text-[color:var(--ink-dim)] transition hover:bg-white/[0.08] hover:text-white"
        >
          {option}
        </button>
      ))}
      {reminder.category === 'compliance' && (
        <p className="mt-1 border-t border-white/10 px-3 pt-2 text-[0.65rem] leading-relaxed text-[color:var(--ink-faint)]">
          Compliance reminders can't be snoozed beyond tomorrow.
        </p>
      )}
    </div>
  )
}
