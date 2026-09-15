import { Moon } from 'lucide-react'
import { cn } from '../lib/cn'
import { formatClock, usePreferences } from '../lib/usePreferences'
import { useStore } from '../store'
import { ToggleSwitch } from './ToggleSwitch'

function startOfDay(d: Date) {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c.getTime()
}

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function WeekStripCard() {
  const { derived } = useStore()
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const todayStart = startOfDay(today)
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const offset = Math.round((startOfDay(date) - todayStart) / 86400000)
    return {
      letter: DAY_LETTERS[i],
      num: date.getDate(),
      isToday: offset === 0,
      hasDot: derived.active.some(r => r.dayOffset === offset),
    }
  })
  return (
    <div className="card shrink-0 p-5">
      <h3 className="font-display mb-3.5 flex items-center gap-2 text-[0.82rem] font-bold">🗓️ This week</h3>
      <div className="mb-3.5 flex justify-between">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 text-[0.68rem] text-[color:var(--ink-faint)]">
            <span>{d.letter}</span>
            <span
              className={cn(
                'flex h-[30px] w-[30px] items-center justify-center rounded-full text-[0.75rem] font-bold text-white',
                d.isToday && 'bg-[color:var(--accent)] shadow-[0_0_14px_rgba(124,111,255,0.5)]',
              )}
            >
              {d.num}
            </span>
            <span className={cn('h-1 w-1 rounded-full', d.hasDot ? 'bg-[color:var(--gold)]' : 'bg-transparent')} />
          </div>
        ))}
      </div>
      <div className="rounded-[12px] bg-white/[0.07] p-3 text-[0.75rem]">
        <div className="mb-1 text-[0.65rem] uppercase tracking-[0.06em] text-[color:var(--ink-faint)]">Next up</div>
        <div className="font-bold">{derived.nextUp ? `${derived.nextUp.title} · ${derived.nextUp.time} today` : 'Nothing more today'}</div>
      </div>
    </div>
  )
}

export function QuietHoursCard() {
  const { prefs, update } = usePreferences()
  return (
    <div className="card shrink-0 p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-display flex items-center gap-2 text-[0.82rem] font-bold">
          <Moon size={14} className="text-[color:var(--ink-dim)]" /> Quiet hours
        </h3>
        <ToggleSwitch on={prefs.quietEnabled} onChange={() => update({ quietEnabled: !prefs.quietEnabled })} label="Quiet hours" />
      </div>
      <div className={cn('flex items-center gap-2 text-[0.8rem]', !prefs.quietEnabled && 'opacity-50')}>
        <label className="flex flex-1 flex-col gap-1 text-[0.68rem] text-[color:var(--ink-faint)]">
          From
          <input type="time" value={prefs.quietStart} disabled={!prefs.quietEnabled} onChange={e => update({ quietStart: e.target.value })} className="field py-1.5 text-[0.8rem]" />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-[0.68rem] text-[color:var(--ink-faint)]">
          Until
          <input type="time" value={prefs.quietEnd} disabled={!prefs.quietEnabled} onChange={e => update({ quietEnd: e.target.value })} className="field py-1.5 text-[0.8rem]" />
        </label>
      </div>
      <p className="mt-2.5 text-[0.7rem] leading-relaxed text-[color:var(--ink-faint)]">
        {prefs.quietEnabled
          ? `No nudges between ${formatClock(prefs.quietStart)} and ${formatClock(prefs.quietEnd)}. Compliance reminders always break through.`
          : 'Nudges can arrive at any hour.'}
      </p>
    </div>
  )
}
