import { useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '../lib/cn'
import { describeRecurrence } from '../lib/recurrence'
import { reminderFromEvent, useDiscover } from '../lib/useDiscover'
import { formatDate } from '../lib/usePremium'
import { useStore } from '../store'
import type { DiscoverEvent } from '../types'

export function DiscoverView() {
  const [query, setQuery] = useState('')
  const { events, subscribed, loading, subscribe, unsubscribe } = useDiscover()
  const { actions } = useStore()
  const q = query.trim().toLowerCase()
  const filtered = events.filter(e => !q || e.title.toLowerCase().includes(q) || e.scope.toLowerCase().includes(q))

  const toggle = (event: DiscoverEvent) => {
    if (subscribed.has(event.id)) {
      void unsubscribe(event)
      actions.removeBySource(event.id)
    } else {
      void subscribe(event)
      actions.addReminder(reminderFromEvent(event))
    }
  }

  return (
    <>
      <div className="card flex items-center gap-2.5 px-4 py-3">
        <Search size={16} className="shrink-0 text-[color:var(--ink-faint)]" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search events to subscribe…"
          aria-label="Search events"
          className="w-full bg-transparent text-base text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-faint)] md:text-[0.85rem]"
        />
      </div>
      {filtered.map(event => {
        const isSub = subscribed.has(event.id)
        const when = [event.nextDate ? formatDate(event.nextDate) : null, event.timeLabel, event.recurrence ? describeRecurrence(event.recurrence) : null]
          .filter(Boolean)
          .join(' · ')
        return (
          <div key={event.id} className="card flex flex-col gap-3 px-[18px] py-4 md:flex-row md:items-center md:gap-3.5">
            <div className="flex min-w-0 items-start gap-3.5 md:flex-1 md:items-center">
              <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] bg-[color:var(--subtle)] text-[1.05rem]" aria-hidden>
                {event.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.9rem] font-bold">{event.title}</span>
                  <span className="badge bg-[color:var(--subtle-2)] text-[color:var(--ink-dim)]">{event.scope}</span>
                </div>
                <div className="mt-[3px] text-[0.75rem] text-[color:var(--ink-faint)]">{[when, event.meta].filter(Boolean).join(' — ')}</div>
              </div>
            </div>
            <button onClick={() => toggle(event)} className={cn('w-full md:w-auto md:shrink-0', isSub ? 'btn-ghost' : 'btn-primary')}>
              {isSub ? 'Subscribed ✓' : 'Subscribe'}
            </button>
          </div>
        )
      })}
      {!loading && events.length === 0 && (
        <EmptyState icon="🔭" title="Nothing published yet" text="Admins publish public events here — school terms, filing dates, club fixtures. Subscribe to any of them and they land in your reminders." />
      )}
      {!loading && events.length > 0 && filtered.length === 0 && (
        <div className="card px-[18px] py-8 text-center text-[0.85rem] text-[color:var(--ink-faint)]">No events match "{query}"</div>
      )}
    </>
  )
}

export function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="text-3xl" aria-hidden>{icon}</span>
      <h3 className="font-display text-[0.95rem] font-bold">{title}</h3>
      <p className="max-w-sm text-[0.8rem] text-[color:var(--ink-dim)]">{text}</p>
    </div>
  )
}

/** Ask for permission to send desktop/mobile nudges. */
