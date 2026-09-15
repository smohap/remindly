import { cn } from '../lib/cn'
import { useStore } from '../store'
import type { Filter } from '../types'

/** Segmented filter for the Today tab — replaces the four stat tiles. */
export function SmartChips() {
  const { state, derived, actions } = useStore()
  const chips: { key: Filter; label: string; count: number; danger?: boolean }[] = [
    { key: 'today', label: 'Today', count: derived.counts.today },
    { key: 'tomorrow', label: 'Tomorrow', count: derived.counts.tomorrow },
    { key: 'week', label: 'Next 7 days', count: derived.counts.week },
    { key: 'overdue', label: 'Overdue', count: derived.counts.overdue, danger: true },
  ]
  return (
    <div className="scrollbar-hidden -mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="Reminder filters">
      {chips.map(chip => {
        const selected = state.filter === chip.key
        return (
          <button
            key={chip.key}
            role="tab"
            aria-selected={selected}
            onClick={() => actions.setFilter(chip.key)}
            className={cn(
              'flex shrink-0 cursor-pointer items-center gap-2 rounded-[10px] px-3 py-1.5 text-[0.8rem] font-semibold transition-colors',
              selected ? 'bg-[color:var(--surface-2)] text-[color:var(--ink)]' : 'text-[color:var(--ink-faint)] hover:text-[color:var(--ink-dim)]',
            )}
          >
            {chip.label}
            <span className={cn('badge', chip.danger && chip.count > 0 ? 'bg-[rgba(248,113,113,0.16)] text-[color:var(--danger)]' : 'bg-white/[0.06] text-[color:var(--ink-faint)]')}>{chip.count}</span>
          </button>
        )
      })}
    </div>
  )
}
