import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
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
  const setYear = (y: number) => setMonth(new Date(y, month.getMonth(), 1))
  // Birthdays, anniversaries and document dates go back decades; renewals go
  // forward a few years. Anything outside is still reachable with the arrows.
  const years = Array.from({ length: today.getFullYear() + 10 - 1900 + 1 }, (_, i) => 1900 + i).reverse()
  const MONTHS = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat('en-NZ', { month: 'long' }).format(new Date(2000, i, 1)))
  const navBtn = 'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[color:var(--ink-dim)] transition hover:bg-[color:var(--hover)] hover:text-[color:var(--ink)]'
  const selectCls = 'cursor-pointer rounded-[8px] border border-transparent bg-transparent px-1.5 py-1 text-[0.86rem] font-bold text-[color:var(--ink)] outline-none hover:border-[color:var(--border-strong)] focus-visible:border-[color:var(--accent)]'

  return (
    <div className="rounded-[14px] border border-[color:var(--border-strong)] bg-[color:var(--subtle)] p-3">
      <div className="mb-2 flex items-center justify-between gap-1">
        <div className="flex items-center">
          <button type="button" onClick={() => shift(-12)} aria-label="Previous year" className={navBtn}>
            <ChevronsLeft size={15} />
          </button>
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className={navBtn}>
            <ChevronLeft size={15} />
          </button>
        </div>
        <div className="font-display flex items-center gap-0.5">
          <select aria-label="Month" value={month.getMonth()} onChange={e => setMonth(new Date(month.getFullYear(), Number(e.target.value), 1))} className={selectCls}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i} className="bg-[color:var(--surface-2)]">{m}</option>
            ))}
          </select>
          <select aria-label="Year" value={month.getFullYear()} onChange={e => setYear(Number(e.target.value))} className={selectCls}>
            {!years.includes(month.getFullYear()) && <option value={month.getFullYear()}>{month.getFullYear()}</option>}
            {years.map(y => (
              <option key={y} value={y} className="bg-[color:var(--surface-2)]">{y}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center">
          <button type="button" onClick={() => shift(1)} aria-label="Next month" className={navBtn}>
            <ChevronRight size={15} />
          </button>
          <button type="button" onClick={() => shift(12)} aria-label="Next year" className={navBtn}>
            <ChevronsRight size={15} />
          </button>
        </div>
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
                  ? 'bg-[color:var(--accent)] text-[color:var(--accent-ink)] shadow-[0_2px_10px_rgba(124,111,255,0.5)]'
                  : isToday
                    ? 'bg-[rgba(45,212,191,0.18)] text-[#7BE9D8] ring-1 ring-[color:var(--teal)]'
                    : 'text-[color:var(--ink)] hover:bg-[color:var(--hover)]',
              )}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[0.66rem] text-[color:var(--ink-faint)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--accent)]" /> Selected
          <span className="ml-2 h-2.5 w-2.5 rounded-full bg-[rgba(45,212,191,0.35)] ring-1 ring-[color:var(--teal)]" /> Today
        </span>
        <button
          type="button"
          onClick={() => {
            onChange(today)
            setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
          }}
          className="cursor-pointer font-semibold text-[color:var(--ink-dim)] transition hover:text-[color:var(--ink)]"
        >
          Jump to today
        </button>
      </div>
    </div>
  )
}
