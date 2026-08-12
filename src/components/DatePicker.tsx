import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/cn'

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
const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7))
const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime()

/**
 * Month-grid date picker. The chosen date is filled with the brand gradient;
 * today is tinted teal and ringed so it stays distinguishable even when another
 * date is selected.
 */
export function DatePicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const today = startOfDay(new Date())
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1))

  const gridStart = startOfWeek(new Date(month.getFullYear(), month.getMonth(), 1))
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))

  return (
    <div className="rounded-[14px] border border-[color:var(--glass-border)] bg-white/[0.06] p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Previous month"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[color:var(--ink-dim)] transition hover:bg-white/[0.12] hover:text-white"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="font-display text-[0.9rem] font-bold">
          {new Intl.DateTimeFormat('en-NZ', { month: 'long', year: 'numeric' }).format(month)}
        </span>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Next month"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[color:var(--ink-dim)] transition hover:bg-white/[0.12] hover:text-white"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[0.6rem] font-bold uppercase tracking-[0.06em] text-[color:var(--ink-faint)]">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map(d => {
          const selected = sameDay(d, value)
          const isToday = sameDay(d, today)
          const inMonth = d.getMonth() === month.getMonth()
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onChange(startOfDay(d))}
              aria-label={new Intl.DateTimeFormat('en-NZ', { dateStyle: 'full' }).format(d)}
              aria-current={selected ? 'date' : undefined}
              className={cn(
                'flex h-9 items-center justify-center rounded-[9px] text-[0.78rem] font-semibold transition',
                !inMonth && 'opacity-30',
                selected
                  ? 'bg-[linear-gradient(135deg,var(--cyan),var(--violet))] text-[#1a1240] shadow-[0_2px_10px_rgba(124,111,255,0.5)]'
                  : isToday
                    ? 'bg-[rgba(45,212,191,0.18)] text-[#7BE9D8] ring-1 ring-[color:var(--teal)]'
                    : 'text-white hover:bg-white/[0.12]',
              )}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[0.66rem] text-[color:var(--ink-faint)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))]" /> Selected
          <span className="ml-2 h-2.5 w-2.5 rounded-full bg-[rgba(45,212,191,0.35)] ring-1 ring-[color:var(--teal)]" /> Today
        </span>
        <button
          type="button"
          onClick={() => {
            onChange(today)
            setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
          }}
          className="cursor-pointer font-semibold text-[color:var(--ink-dim)] transition hover:text-white"
        >
          Jump to today
        </button>
      </div>
    </div>
  )
}
