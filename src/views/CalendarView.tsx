import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/cn'
import { parseClock } from '../lib/useNotifications'
import { Section } from '../components/Section'
import { useStore } from '../store'
import type { Reminder } from '../types'

type Scale = 'day' | 'week' | 'month' | 'year'
const SCALES: Scale[] = ['day', 'week', 'month', 'year']

const CAT_COLOR: Record<Reminder['category'], string> = {
  compliance: 'var(--red)',
  group: 'var(--teal)',
  personal: 'var(--violet)',
}

const startOfDay = (d: Date) => {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}
const addDays = (d: Date, n: number) => {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}
/** Monday-based week start. */
const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7))
const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime()
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-NZ', o).format(d)

export function CalendarView() {
  const { derived } = useStore()
  const [scale, setScale] = useState<Scale>('month')
  const [cursor, setCursor] = useState(() => startOfDay(new Date()))
  const today = startOfDay(new Date())

  /** Reminders keyed by the actual calendar day they fall on. */
  const byDay = useMemo(() => {
    const map = new Map<number, Reminder[]>()
    for (const r of derived.active) {
      const key = startOfDay(addDays(today, r.dayOffset)).getTime()
      map.set(key, [...(map.get(key) ?? []), r])
    }
    for (const list of map.values()) {
      list.sort((a, b) => (parseClock(a.time) ?? -1) - (parseClock(b.time) ?? -1))
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derived.active, today.getTime()])

  const onDay = (d: Date) => byDay.get(startOfDay(d).getTime()) ?? []

  function move(dir: 1 | -1) {
    const c = new Date(cursor)
    if (scale === 'day') c.setDate(c.getDate() + dir)
    else if (scale === 'week') c.setDate(c.getDate() + 7 * dir)
    else if (scale === 'month') c.setMonth(c.getMonth() + dir)
    else c.setFullYear(c.getFullYear() + dir)
    setCursor(startOfDay(c))
  }

  const label =
    scale === 'day'
      ? fmt(cursor, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : scale === 'week'
        ? `${fmt(startOfWeek(cursor), { day: 'numeric', month: 'short' })} – ${fmt(addDays(startOfWeek(cursor), 6), { day: 'numeric', month: 'short', year: 'numeric' })}`
        : scale === 'month'
          ? fmt(cursor, { month: 'long', year: 'numeric' })
          : String(cursor.getFullYear())

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="glass inline-flex gap-1 rounded-full p-1">
          {SCALES.map(s => (
            <button
              key={s}
              onClick={() => setScale(s)}
              className="relative cursor-pointer rounded-full px-4 py-1.5 text-[0.78rem] font-bold capitalize transition-colors"
            >
              {scale === s && (
                <motion.span
                  layoutId="cal-scale"
                  className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))]"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
              <span className={cn('relative', scale === s ? 'text-[#1a1240]' : 'text-[color:var(--ink-dim)]')}>{s}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => move(-1)}
            aria-label={`Previous ${scale}`}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[color:var(--glass-border)] bg-white/[0.08] transition hover:bg-white/[0.16]"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCursor(today)}
            className="cursor-pointer rounded-full border border-[color:var(--glass-border)] bg-white/[0.08] px-3.5 py-1.5 text-[0.75rem] font-semibold transition hover:bg-white/[0.16]"
          >
            Today
          </button>
          <button
            onClick={() => move(1)}
            aria-label={`Next ${scale}`}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[color:var(--glass-border)] bg-white/[0.08] transition hover:bg-white/[0.16]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <h2 className="font-display px-1 text-[1.15rem] font-bold">{label}</h2>

      {scale === 'day' && <DayView date={cursor} items={onDay(cursor)} />}
      {scale === 'week' && <WeekView cursor={cursor} onDay={onDay} today={today} onPick={d => { setCursor(d); setScale('day') }} />}
      {scale === 'month' && <MonthView cursor={cursor} onDay={onDay} today={today} onPick={d => { setCursor(d); setScale('day') }} />}
      {scale === 'year' && <YearView cursor={cursor} onDay={onDay} today={today} onPick={d => { setCursor(d); setScale('month') }} />}
    </div>
  )
}

function DayView({ date, items }: { date: Date; items: Reminder[] }) {
  if (items.length === 0) {
    return (
      <div className="glass flex flex-col items-center gap-2 px-6 py-12 text-center">
        <span className="text-3xl" aria-hidden>🌤️</span>
        <h3 className="font-display text-[0.95rem] font-bold">Nothing on {fmt(date, { day: 'numeric', month: 'long' })}</h3>
        <p className="max-w-xs text-[0.8rem] text-[color:var(--ink-dim)]">A clear day. Use the arrows above to look ahead.</p>
      </div>
    )
  }
  return <Section title={`${items.length} reminder${items.length === 1 ? '' : 's'}`} items={items} />
}

function WeekView({ cursor, onDay, today, onPick }: { cursor: Date; onDay: (d: Date) => Reminder[]; today: Date; onPick: (d: Date) => void }) {
  const start = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return (
    <div className="grid gap-2 sm:grid-cols-7">
      {days.map(d => {
        const items = onDay(d)
        const isToday = sameDay(d, today)
        return (
          <button
            key={d.toISOString()}
            onClick={() => onPick(d)}
            className={cn(
              'glass flex min-h-[128px] flex-col gap-1.5 p-3 text-left transition hover:bg-white/[0.14]',
              isToday && 'ring-1 ring-[color:var(--cyan)]',
            )}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[0.68rem] uppercase tracking-[0.06em] text-[color:var(--ink-faint)]">{fmt(d, { weekday: 'short' })}</span>
              <span className={cn('font-display text-[1.05rem] font-bold', isToday && 'text-[color:var(--cyan)]')}>{d.getDate()}</span>
            </div>
            {items.slice(0, 3).map(r => (
              <span key={r.id} className="flex items-start gap-1.5 text-[0.7rem] leading-snug text-[color:var(--ink-dim)]">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: CAT_COLOR[r.category] }} />
                <span>{r.time ? `${r.time} · ` : ''}{r.title}</span>
              </span>
            ))}
            {items.length > 3 && <span className="text-[0.66rem] text-[color:var(--ink-faint)]">+{items.length - 3} more</span>}
          </button>
        )
      })}
    </div>
  )
}

function MonthView({ cursor, onDay, today, onPick }: { cursor: Date; onDay: (d: Date) => Reminder[]; today: Date; onPick: (d: Date) => void }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = startOfWeek(first)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  return (
    <div className="glass p-3 sm:p-4">
      <div className="mb-1 grid grid-cols-7 gap-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="pb-1 text-center text-[0.64rem] font-bold uppercase tracking-[0.07em] text-[color:var(--ink-faint)]">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map(d => {
          const items = onDay(d)
          const isToday = sameDay(d, today)
          const inMonth = d.getMonth() === cursor.getMonth()
          return (
            <button
              key={d.toISOString()}
              onClick={() => onPick(d)}
              className={cn(
                'flex min-h-[62px] flex-col items-center gap-1 rounded-[10px] p-1.5 transition hover:bg-white/[0.12] sm:min-h-[76px]',
                !inMonth && 'opacity-35',
                isToday && 'bg-[linear-gradient(135deg,var(--cyan),var(--violet))] text-[#1a1240]',
              )}
            >
              <span className={cn('text-[0.78rem] font-bold', isToday && 'text-[#1a1240]')}>{d.getDate()}</span>
              <span className="flex flex-wrap justify-center gap-0.5">
                {items.slice(0, 4).map(r => (
                  <span key={r.id} className="h-1.5 w-1.5 rounded-full" style={{ background: isToday ? 'rgba(26,18,64,.75)' : CAT_COLOR[r.category] }} />
                ))}
              </span>
              {items.length > 4 && <span className="text-[0.6rem] text-[color:var(--ink-faint)]">+{items.length - 4}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function YearView({ cursor, onDay, today, onPick }: { cursor: Date; onDay: (d: Date) => Reminder[]; today: Date; onPick: (d: Date) => void }) {
  const year = cursor.getFullYear()
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }, (_, m) => {
        const first = new Date(year, m, 1)
        const daysInMonth = new Date(year, m + 1, 0).getDate()
        const lead = (first.getDay() + 6) % 7
        let count = 0
        for (let i = 1; i <= daysInMonth; i++) count += onDay(new Date(year, m, i)).length
        const isThisMonth = today.getFullYear() === year && today.getMonth() === m
        return (
          <button
            key={m}
            onClick={() => onPick(first)}
            className={cn('glass p-3 text-left transition hover:bg-white/[0.14]', isThisMonth && 'ring-1 ring-[color:var(--cyan)]')}
          >
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-display text-[0.92rem] font-bold">{fmt(first, { month: 'long' })}</span>
              {count > 0 && (
                <span className="rounded-full bg-white/[0.14] px-2 py-[1px] text-[0.62rem] font-bold text-[color:var(--ink-dim)]">{count}</span>
              )}
            </div>
            <div className="grid grid-cols-7 gap-[3px]">
              {Array.from({ length: lead }, (_, i) => <span key={`x${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const d = new Date(year, m, i + 1)
                const has = onDay(d).length > 0
                const isToday = sameDay(d, today)
                return (
                  <span
                    key={i}
                    className={cn(
                      'flex h-[15px] items-center justify-center rounded-[3px] text-[0.55rem]',
                      isToday
                        ? 'bg-[linear-gradient(135deg,var(--cyan),var(--violet))] font-bold text-[#1a1240]'
                        : has
                          ? 'bg-[rgba(124,111,255,0.45)] text-white'
                          : 'text-[color:var(--ink-faint)]',
                    )}
                  >
                    {i + 1}
                  </span>
                )
              })}
            </div>
          </button>
        )
      })}
    </div>
  )
}
