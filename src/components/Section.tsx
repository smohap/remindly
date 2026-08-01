import { AnimatePresence, motion } from 'motion/react'
import type { Reminder } from '../types'
import { ReminderCard } from './ReminderCard'

interface SectionProps {
  title: string
  items: Reminder[]
  actionLabel?: string
  onAction?: () => void
  emptyText?: string
}

export function Section({ title, items, actionLabel, onAction, emptyText }: SectionProps) {
  return (
    <section className="flex flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="font-display text-[0.95rem] font-bold">{title}</h2>
        {actionLabel && (
          <button
            onClick={onAction}
            className="cursor-pointer text-[0.75rem] font-semibold text-[color:var(--ink-faint)] transition hover:text-white"
          >
            {actionLabel}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="glass px-[18px] py-6 text-center text-[0.8rem] text-[color:var(--ink-faint)]">{emptyText ?? 'All clear 🎉'}</div>
      ) : (
        <AnimatePresence initial={false}>
          {items.map(reminder => (
            <motion.div
              key={reminder.id}
              layout
              exit={{ opacity: 0, x: 48, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              /* Generous inset padding so the hover lift and the glass shadow
                 aren't clipped by the overflow-hidden needed for exit collapse. */
              className="-mx-3 -mt-3 overflow-hidden px-3 pt-3"
            >
              <div className="pb-3">
                <ReminderCard reminder={reminder} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </section>
  )
}
