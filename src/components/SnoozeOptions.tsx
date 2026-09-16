import { SNOOZE_OPTIONS, type SnoozeKey } from '../lib/snooze'
import type { Reminder } from '../types'

export function SnoozeOptions({ reminder, onPick }: { reminder: Reminder; onPick: (key: SnoozeKey) => void }) {
  // Compliance items must be dealt with the same day, so only short snoozes apply.
  const options = reminder.category === 'compliance' ? SNOOZE_OPTIONS.filter(o => o.key === 'hour' || o.key === 'evening') : SNOOZE_OPTIONS
  return (
    <div className="flex flex-col">
      {options.map(option => (
        <button
          key={option.key}
          onClick={() => onPick(option.key)}
          className="flex cursor-pointer items-center justify-between rounded-[10px] px-3 py-2.5 text-left text-[0.8rem] font-semibold text-[color:var(--ink-dim)] transition hover:bg-[color:var(--hover)] hover:text-[color:var(--ink)]"
        >
          <span>{option.label}</span>
          <span className="text-[0.7rem] font-normal text-[color:var(--ink-faint)]">{option.hint}</span>
        </button>
      ))}
      {reminder.category === 'compliance' && (
        <p className="mt-1 border-t border-[color:var(--border)] px-3 pt-2 text-[0.65rem] leading-relaxed text-[color:var(--ink-faint)]">
          Compliance reminders can't be snoozed past today.
        </p>
      )}
    </div>
  )
}
