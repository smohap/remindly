import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react'
import { AlarmClock, Check, Pencil, Repeat } from 'lucide-react'
import { cn } from '../lib/cn'
import { describeRecurrence } from '../lib/recurrence'
import { useIsMobile } from '../lib/useIsMobile'
import { useStore } from '../store'
import type { Reminder } from '../types'
import { SnoozeOptions } from './SnoozeOptions'

// Only compliance gets a coloured edge — it is the one category that must
// not be missed. Everything else stays neutral.
const CATEGORY_COLOR: Record<Reminder['category'], string> = {
  compliance: 'var(--danger)',
  group: 'transparent',
  personal: 'transparent',
}

const GHOST_BTN = 'btn-ghost flex-1 px-[13px] py-1.5 text-[0.76rem] md:flex-none'
const ACK_BTN = 'btn-primary flex-1 px-[13px] py-1.5 text-[0.76rem] md:flex-none'

export function ReminderCard({ reminder }: { reminder: Reminder }) {
  const { actions } = useStore()
  const isMobile = useIsMobile()
  const x = useMotionValue(0)
  const ackHintOpacity = useTransform(x, [12, 80], [0, 1])
  const snoozeHintOpacity = useTransform(x, [-80, -12], [1, 0])
  const snoozeBtnRef = useRef<HTMLButtonElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const overdue = reminder.dayOffset < 0

  useEffect(() => {
    if (!menuPos) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuPos(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuPos])

  const openSnooze = () => {
    if (isMobile) {
      actions.openSnooze(reminder.id)
      return
    }
    const rect = snoozeBtnRef.current?.getBoundingClientRect()
    if (rect) setMenuPos({ top: rect.bottom + 8, right: Math.max(window.innerWidth - rect.right, 12) })
  }

  return (
    <div className="relative">
      {isMobile && (
        <div aria-hidden className="absolute inset-0 flex items-center justify-between rounded-[16px] px-6">
          <motion.div
            style={{ opacity: ackHintOpacity }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--teal)] text-[#0c2b26]"
          >
            <Check size={18} strokeWidth={3} />
          </motion.div>
          <motion.div
            style={{ opacity: snoozeHintOpacity }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--gold)] text-[#3a2c05]"
          >
            <AlarmClock size={18} />
          </motion.div>
        </div>
      )}
      <motion.div
        drag={isMobile ? 'x' : false}
        dragSnapToOrigin
        dragElastic={0.5}
        dragConstraints={{ left: -140, right: 140 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 96) actions.acknowledge(reminder.id)
          else if (info.offset.x < -96) actions.openSnooze(reminder.id)
        }}
        style={{ x, borderLeftWidth: reminder.category === 'compliance' ? 3 : 1, borderLeftColor: reminder.category === 'compliance' ? CATEGORY_COLOR.compliance : undefined }}
        className={cn('card relative flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-[color:var(--surface-2)] md:flex-row md:items-center md:gap-3.5', overdue && 'border-[rgba(248,113,113,0.35)]')}
      >
        <div className="flex min-w-0 items-start gap-3.5 md:flex-1 md:items-center">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.05] text-[1rem]" aria-hidden>
            {reminder.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.88rem] font-semibold">{reminder.title}</span>
              {reminder.category === 'compliance' && <span className="badge bg-[rgba(248,113,113,0.16)] text-[color:var(--danger)]">Ack required</span>}
              {reminder.recurrence && (
                <span className="badge bg-white/[0.06] text-[color:var(--ink-faint)]" title={describeRecurrence(reminder.recurrence)}>
                  <Repeat size={10} /> {describeRecurrence(reminder.recurrence).replace('Every ', '')}
                </span>
              )}
            </div>
            <div className="mt-[3px] text-[0.75rem] text-[color:var(--ink-faint)]">{reminder.meta}</div>
          </div>
          {/* Only the creator can change a reminder. */}
          {reminder.ownedByMe !== false && (
            <button
              onClick={() => actions.openEdit(reminder.id)}
              aria-label={`Edit ${reminder.title}`}
              title="Edit or delete"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[color:var(--ink-faint)] transition hover:bg-white/[0.08] hover:text-[color:var(--ink)]"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
        <div className="flex w-full gap-2 md:w-auto md:shrink-0">
          {overdue ? (
            <button onClick={() => actions.acknowledge(reminder.id)} className={ACK_BTN}>
              {reminder.resolveLabel ?? 'Resolve now'}
            </button>
          ) : (
            <>
              <button ref={snoozeBtnRef} onClick={openSnooze} className={GHOST_BTN}>
                Snooze
              </button>
              <button onClick={() => actions.acknowledge(reminder.id)} className={ACK_BTN}>
                {reminder.category === 'compliance' ? 'Acknowledge' : 'Done'}
              </button>
            </>
          )}
        </div>
      </motion.div>
      <AnimatePresence>
        {menuPos && (
          <>
            <button aria-label="Close snooze menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setMenuPos(null)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="card fixed z-50 w-60 rounded-2xl p-2"
              style={{ top: menuPos.top, right: menuPos.right }}
              role="menu"
            >
              <SnoozeOptions
                reminder={reminder}
                onPick={key => {
                  actions.snooze(reminder.id, key)
                  setMenuPos(null)
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
