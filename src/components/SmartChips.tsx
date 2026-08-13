import { motion } from 'motion/react'
import { cn } from '../lib/cn'
import { useStore } from '../store'
import type { Filter } from '../types'

export function SmartChips() {
  const { state, derived, actions } = useStore()
  const chips: { key: Filter; label: string; count: number; danger?: boolean }[] = [
    { key: 'today', label: 'Today', count: derived.counts.today },
    { key: 'tomorrow', label: 'Tomorrow', count: derived.counts.tomorrow },
    { key: 'week', label: 'Next 7 days', count: derived.counts.week },
    { key: 'overdue', label: 'Overdue', count: derived.counts.overdue, danger: true },
  ]
  return (
    <div
      className="scrollbar-hidden -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-1 md:mx-0 md:overflow-visible md:px-0"
      role="tablist"
      aria-label="Reminder filters"
    >
      {chips.map(chip => {
        const selected = state.filter === chip.key
        return (
          <motion.button
            key={chip.key}
            role="tab"
            aria-selected={selected}
            onClick={() => actions.setFilter(chip.key)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            className={cn(
              'glass relative min-w-[112px] flex-1 shrink-0 snap-start cursor-pointer rounded-2xl px-[18px] py-3.5 text-left',
              chip.danger && 'border-[rgba(255,107,107,0.4)]',
            )}
          >
            {selected && (
              <motion.span
                layoutId="chip-glow"
                className="absolute inset-0 rounded-2xl border border-white/40 bg-[color:var(--glass-strong)]"
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              />
            )}
            <span className="relative flex flex-col gap-0.5">
              <span className={cn('font-display text-[1.4rem] font-extrabold leading-tight', chip.danger && 'text-[color:var(--red)]')}>
                {chip.count}
              </span>
              <span className="text-[0.72rem] font-semibold text-[color:var(--ink-dim)]">{chip.label}</span>
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
