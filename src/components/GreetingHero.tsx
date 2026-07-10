import { useEffect } from 'react'
import { animate, motion, useMotionTemplate, useMotionValue, useReducedMotion } from 'motion/react'
import { useAuth } from '../auth/AuthContext'
import { useStore } from '../store'

function FocusOrb({ done, total }: { done: number; total: number }) {
  const reduce = useReducedMotion()
  const sweep = useMotionValue(0)
  const target = total > 0 ? (done / total) * 360 : 0

  useEffect(() => {
    const controls = animate(sweep, target, reduce ? { duration: 0 } : { duration: 1.1, ease: 'easeOut' })
    return () => controls.stop()
  }, [target, sweep, reduce])

  const background = useMotionTemplate`conic-gradient(var(--teal) 0deg, var(--teal) ${sweep}deg, rgba(255,255,255,0.14) ${sweep}deg)`

  return (
    <motion.div
      style={{ background }}
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-[0_0_22px_rgba(45,212,191,0.35)]"
    >
      <div className="flex h-[50px] w-[50px] flex-col items-center justify-center rounded-full bg-[rgba(36,27,78,0.9)]">
        <span className="font-display text-base font-extrabold leading-none">
          {done}/{total}
        </span>
        <span className="text-[0.5rem] uppercase tracking-[0.06em] text-[color:var(--ink-faint)]">Done</span>
      </div>
    </motion.div>
  )
}

export function GreetingHero() {
  const { derived } = useStore()
  const { user } = useAuth()
  const firstName = user?.name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateLine = new Intl.DateTimeFormat('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  const n = derived.counts.today
  return (
    <div className="glass flex flex-col items-start gap-4 px-6 py-[22px] md:flex-row md:items-center md:gap-6">
      <div>
        <h1 className="font-display mb-1 text-xl font-bold md:text-2xl">{greeting}, {firstName} 👋</h1>
        <p className="text-[0.82rem] text-[color:var(--ink-dim)]">
          {dateLine} —{' '}
          {n === 0 ? 'you’re all caught up' : `${n} reminder${n === 1 ? '' : 's'} need${n === 1 ? 's' : ''} you before quiet hours begin`}
        </p>
      </div>
      <div className="flex items-center gap-3.5 md:ml-auto">
        <FocusOrb done={derived.done} total={derived.total} />
        <div>
          <div className="text-[0.85rem] font-bold">{derived.percent}% acknowledged</div>
          <div className="text-[0.72rem] text-[color:var(--ink-faint)]">
            {derived.counts.overdue} overdue · {derived.compliancePending} compliance pending
          </div>
        </div>
      </div>
    </div>
  )
}
