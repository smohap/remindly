import { useEffect, useState } from 'react'
import { AlertTriangle, Bell, CalendarClock, Check, CheckCheck, History, Inbox, Repeat, Search, Sparkles, Trash2, Users } from 'lucide-react'
import { SegmentBar, useSegment } from '../components/SegmentBar'
import { INBOX_KINDS, refreshActivity, useActivity, type ActivityEntry, type ActivityKind } from '../lib/activityStore'
import { cn } from '../lib/cn'
import { useStore } from '../store'

const SEGMENTS = ['inbox', 'history'] as const
type HistoryFilter = 'all' | 'done' | 'overdue' | 'snoozed'

const KIND_ICON: Partial<Record<ActivityKind, typeof Bell>> = {
  'reminder.due': Bell,
  'reminder.escalated': AlertTriangle,
  'reminder.acknowledged': Check,
  'reminder.rolled': Repeat,
  'reminder.snoozed': CalendarClock,
  'reminder.removed': Trash2,
  'plan.changed': Sparkles,
  'subscription.added': Sparkles,
  'group.invited': Users,
  'group.requested': Users,
  'group.approved': Check,
}

const KIND_LABEL: Record<ActivityKind, string> = {
  'reminder.added': 'Added',
  'reminder.due': 'Due',
  'reminder.acknowledged': 'Done',
  'reminder.snoozed': 'Snoozed',
  'reminder.rolled': 'Rolled forward',
  'reminder.escalated': 'Escalated',
  'reminder.removed': 'Deleted',
  'subscription.added': 'Subscribed',
  'subscription.removed': 'Unsubscribed',
  'plan.changed': 'Plan',
  'group.invited': 'Invitation',
  'group.requested': 'Join request',
  'group.approved': 'Group',
}

const timeFmt = new Intl.DateTimeFormat('en-NZ', { hour: 'numeric', minute: '2-digit' })
const dayFmt = new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })

function when(iso: string): string {
  const d = new Date(iso)
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay ? timeFmt.format(d) : `${dayFmt.format(d)}, ${timeFmt.format(d)}`
}

function Row({ entry, onOpen, onRead }: { entry: ActivityEntry; onOpen?: () => void; onRead?: () => void }) {
  const Icon = KIND_ICON[entry.kind] ?? Bell
  return (
    <button
      onClick={() => {
        onRead?.()
        onOpen?.()
      }}
      className={cn(
        'card flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[color:var(--surface-2)]',
        !entry.read && 'border-l-2 border-l-[color:var(--accent)]',
      )}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[color:var(--subtle)] text-[color:var(--ink-dim)]">
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className={cn('truncate text-[0.88rem]', entry.read ? 'font-medium' : 'font-semibold')}>{entry.title}</span>
          <span className="badge bg-[color:var(--subtle)] text-[color:var(--ink-faint)]">{KIND_LABEL[entry.kind]}</span>
        </span>
        {entry.detail && <span className="mt-0.5 block truncate text-[0.75rem] text-[color:var(--ink-faint)]">{entry.detail}</span>}
      </span>
      <span className="shrink-0 text-[0.7rem] text-[color:var(--ink-faint)]">{when(entry.at)}</span>
    </button>
  )
}

function Empty({ icon: Icon, title, text }: { icon: typeof Inbox; title: string; text: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <Icon size={26} className="text-[color:var(--ink-faint)]" />
      <h3 className="font-display text-[0.95rem] font-bold">{title}</h3>
      <p className="max-w-sm text-[0.8rem] text-[color:var(--ink-dim)]">{text}</p>
    </div>
  )
}

const FILTERS: HistoryFilter[] = ['all', 'done', 'overdue', 'snoozed']

export function InboxView() {
  const [segment, setSegment] = useSegment(SEGMENTS, 'inbox')
  const { entries, unread, markRead, markAllRead, clear } = useActivity()
  const { state, actions } = useStore()
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [query, setQuery] = useState('')

  const openReminder = (e: ActivityEntry) => {
    if (e.kind.startsWith('group.')) {
      actions.setTab('groups')
      return
    }
    if (e.reminderId && state.reminders.some(r => r.id === e.reminderId)) actions.openEdit(e.reminderId)
  }

  // Membership notifications are written by the server; pick them up on open.
  useEffect(() => {
    void refreshActivity()
  }, [])

  const inbox = entries.filter(e => INBOX_KINDS.includes(e.kind))
  const unreadRows = inbox.filter(e => !e.read)
  const readRows = inbox.filter(e => e.read)

  const q = query.trim().toLowerCase()
  const history = entries
    .filter(e => {
      if (filter === 'done') return e.kind === 'reminder.acknowledged' || e.kind === 'reminder.rolled'
      if (filter === 'snoozed') return e.kind === 'reminder.snoozed'
      if (filter === 'overdue') return e.kind === 'reminder.escalated' || Boolean(e.detail?.toLowerCase().includes('overdue'))
      return true
    })
    .filter(e => !q || e.title.toLowerCase().includes(q) || Boolean(e.detail?.toLowerCase().includes(q)))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentBar
          label="Inbox sections"
          value={segment}
          onChange={setSegment}
          segments={[
            { key: 'inbox', label: 'Inbox', icon: Inbox, badge: unread },
            { key: 'history', label: 'History', icon: History },
          ]}
        />
        {segment === 'inbox' && unread > 0 && (
          <button onClick={markAllRead} className="btn-ghost">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
        {segment === 'history' && entries.length > 0 && (
          <button onClick={clear} className="btn-ghost btn-danger">
            <Trash2 size={14} /> Clear history
          </button>
        )}
      </div>

      {segment === 'inbox' && (
        <>
          {inbox.length === 0 && <Empty icon={Inbox} title="Nothing needs you right now" text="When a reminder comes due, escalates, or your plan changes, it lands here." />}
          {unreadRows.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="px-1 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">New</div>
              {unreadRows.map(e => (
                <Row key={e.id} entry={e} onRead={() => markRead(e.id)} onOpen={() => openReminder(e)} />
              ))}
            </div>
          )}
          {readRows.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="px-1 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">Earlier</div>
              {readRows.slice(0, 50).map(e => (
                <Row key={e.id} entry={e} onOpen={() => openReminder(e)} />
              ))}
            </div>
          )}
        </>
      )}

      {segment === 'history' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="card flex flex-1 items-center gap-2 px-3 py-2">
              <Search size={14} className="text-[color:var(--ink-faint)]" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search history" aria-label="Search history" className="w-full bg-transparent text-[0.85rem] outline-none placeholder:text-[color:var(--ink-faint)]" />
            </div>
            <div className="flex gap-1">
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn('rounded-[9px] px-2.5 py-1.5 text-[0.76rem] font-semibold capitalize transition', filter === f ? 'bg-[color:var(--surface-2)] text-[color:var(--ink)]' : 'text-[color:var(--ink-faint)] hover:text-[color:var(--ink-dim)]')}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          {history.length === 0 ? (
            <Empty icon={History} title="No history yet" text="Everything you add, complete, snooze or delete is recorded here." />
          ) : (
            <div className="flex flex-col gap-2">
              {history.map(e => (
                <Row key={e.id} entry={e} onOpen={() => openReminder(e)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
