import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react'
import { AlarmClock, Check, Pencil } from 'lucide-react'
import { cn } from '../lib/cn'
import { useIsMobile } from '../lib/useIsMobile'
import { useStore } from '../store'
import type { Reminder } from '../types'
import { SnoozeOptions } from './SnoozeOptions'

const CATEGORY_COLOR: Record<Reminder['category'], string> = {
  compliance: 'var(--red)',
  group: 'var(--teal)',
  personal: 'var(--violet)',
}

const GHOST_BTN =
  'flex-1 cursor-pointer rounded-[10px] border border-[color:var(--glass-border)] bg-white/[0.09] px-[13px] py-2 text-[0.72rem] font-bold text-[color:var(--ink-dim)] transition hover:bg-white/[0.14] hover:text-white md:flex-none'
const ACK_BTN =
  'flex-1 cursor-pointer rounded-[10px] bg-[linear-gradient(135deg,#2DD4BF,#1FA895)] px-[13px] py-2 text-[0.72rem] font-bold text-[#0c2b26] transition hover:brightness-110 md:flex-none'

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
        <div aria-hidden className="absolute inset-0 flex items-center justify-between rounded-[22px] px-6">
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
        whileHover={isMobile ? undefined : { y: -2 }}
        style={{ x, borderLeftWidth: 3, borderLeftColor: CATEGORY_COLOR[reminder.category] }}
        className={cn('glass relative flex flex-col gap-3 px-[18px] py-4 md:flex-row md:items-center md:gap-3.5', overdue && 'opacity-85')}
      >
        <div className="flex min-w-0 items-start gap-3.5 md:flex-1 md:items-center">
          <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-[1.05rem]" aria-hidden>
            {reminder.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.9rem] font-bold">{reminder.title}</span>
              {reminder.tag && (
                <span className="rounded-full bg-[rgba(255,107,107,0.22)] px-2 py-[2px] text-[0.6rem] font-extrabold uppercase tracking-[0.05em] text-[#FFB4B4]">
                  {reminder.tag}
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
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[color:var(--ink-faint)] transition hover:bg-white/[0.12] hover:text-white"
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
                {reminder.category === 'compliance' ? 'Acknowledge' : 'Ack'}
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
              className="glass fixed z-50 w-60 rounded-2xl p-2"
              style={{ top: menuPos.top, right: menuPos.right }}
              role="menu"
            >
              <SnoozeOptions
                reminder={reminder}
                onPick={label => {
                  actions.snooze(reminder.id, label)
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
