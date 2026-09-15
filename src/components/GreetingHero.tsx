import { useAuth } from '../auth/AuthContext'
import { useStore } from '../store'

/** One-line greeting with a small progress ring — no hero card. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0
  const r = 15
  const c = 2 * Math.PI * r
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden className="shrink-0 -rotate-90">
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--ok)" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset 0.6s ease-out' }} />
    </svg>
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
    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <h1 className="font-display text-[1.35rem] font-bold leading-tight">{greeting}, {firstName}</h1>
        <p className="text-[0.8rem] text-[color:var(--ink-dim)]">
          {dateLine} · {n === 0 ? 'nothing left for today' : `${n} to do today`}
          {derived.counts.overdue > 0 && <span className="text-[color:var(--danger)]"> · {derived.counts.overdue} overdue</span>}
        </p>
      </div>
      {derived.total > 0 && (
        <div className="flex items-center gap-2.5">
          <ProgressRing done={derived.done} total={derived.total} />
          <div className="leading-tight">
            <div className="text-[0.82rem] font-semibold">{derived.done} of {derived.total} done</div>
            <div className="text-[0.7rem] text-[color:var(--ink-faint)]">today</div>
          </div>
        </div>
      )}
    </div>
  )
}
