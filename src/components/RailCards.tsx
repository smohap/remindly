import { Hash, Mail, MessageSquare, Smartphone } from 'lucide-react'
import { cn } from '../lib/cn'
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
    <div className="glass p-5">
      <h3 className="font-display mb-3.5 flex items-center gap-2 text-[0.82rem] font-bold">🗓️ This week</h3>
      <div className="mb-3.5 flex justify-between">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 text-[0.68rem] text-[color:var(--ink-faint)]">
            <span>{d.letter}</span>
            <span
              className={cn(
                'flex h-[30px] w-[30px] items-center justify-center rounded-full text-[0.75rem] font-bold text-white',
                d.isToday && 'bg-[linear-gradient(135deg,var(--cyan),var(--violet))] shadow-[0_0_14px_rgba(124,111,255,0.5)]',
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

export function PersonalAlarmCard() {
  const { state, actions } = useStore()
  return (
    <div className="glass relative overflow-hidden p-[18px]">
      <span className="absolute right-3 top-2 text-[2.6rem] opacity-[0.12]" aria-hidden>
        ⏰
      </span>
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="font-display text-[0.82rem] font-bold">⏰ Personal alarm</h3>
        <ToggleSwitch on={state.toggles.personalAlarm} onChange={() => actions.toggle('personalAlarm')} label="Personal alarm" />
      </div>
      <p className="max-w-[80%] text-[0.72rem] leading-relaxed text-[color:var(--ink-dim)]">
        Bypasses silent &amp; DND for reminders you mark critical. Loops until dismissed.
      </p>
    </div>
  )
}

const CHANNELS = [
  { key: 'push', label: 'Push', icon: Smartphone },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'sms', label: 'SMS', icon: MessageSquare },
  { key: 'slack', label: 'Slack', icon: Hash },
] as const

export function ChannelsCard() {
  const { state, actions } = useStore()
  return (
    <div className="glass p-5">
      <h3 className="font-display mb-2 text-[0.82rem] font-bold">Notification channels</h3>
      {CHANNELS.map(channel => (
        <div key={channel.key} className="flex items-center justify-between border-b border-white/10 py-[9px] last:border-0 last:pb-0">
          <div className="flex items-center gap-[9px] text-[0.8rem] font-semibold">
            <channel.icon size={15} className="text-[color:var(--ink-dim)]" />
            {channel.label}
          </div>
          <ToggleSwitch on={state.toggles[channel.key]} onChange={() => actions.toggle(channel.key)} label={`${channel.label} notifications`} />
        </div>
      ))}
    </div>
  )
}

export function QuietHoursCard() {
  const { state, actions } = useStore()
  return (
    <div className="glass p-5">
      <h3 className="font-display mb-2 text-[0.82rem] font-bold">🌙 Quiet hours</h3>
      <div className="flex items-center justify-between py-1">
        <div className="text-[0.8rem] font-semibold">10:00 PM – 7:00 AM</div>
        <ToggleSwitch on={state.toggles.quietHours} onChange={() => actions.toggle('quietHours')} label="Quiet hours" />
      </div>
      <div className="relative mt-2.5 h-1.5 rounded-[10px] bg-white/[0.12]">
        <div className="absolute left-0 h-full w-[42%] rounded-[10px] bg-[linear-gradient(90deg,var(--violet),var(--magenta))]" />
      </div>
      <div className="mt-2 flex justify-between gap-2 text-[0.68rem] text-[color:var(--ink-faint)]">
        <span>10 PM</span>
        <span className="text-center">Compliance always breaks through</span>
        <span>7 AM</span>
      </div>
    </div>
  )
}
