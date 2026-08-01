import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut, Search, Sparkles, User, Users } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/Avatar'
import { GreetingHero } from '../components/GreetingHero'
import { ChannelsCard, PersonalAlarmCard, QuietHoursCard, WeekStripCard } from '../components/RailCards'
import { Section } from '../components/Section'
import { SmartChips } from '../components/SmartChips'
import { discoverEvents } from '../data'
import { cn } from '../lib/cn'
import { timeMinutes, useStore } from '../store'
import type { Reminder } from '../types'
import { GroupsView } from './GroupsView'
import { PremiumView } from './PremiumView'
import { ProfileView } from './ProfileView'
import { WorkspaceView } from './WorkspaceView'

function sortByDayAndTime(a: Reminder, b: Reminder) {
  return a.dayOffset - b.dayOffset || timeMinutes(a.time) - timeMinutes(b.time)
}

function TodayView() {
  const { state, derived, actions } = useStore()
  const todayItems = derived.active.filter(r => r.dayOffset === 0)
  const tomorrowItems = derived.active.filter(r => r.dayOffset === 1).sort(sortByDayAndTime)
  const weekItems = derived.active.filter(r => r.dayOffset >= 0 && r.dayOffset <= 6).sort(sortByDayAndTime)
  const overdueItems = derived.active.filter(r => r.dayOffset < 0)
  return (
    <>
      <GreetingHero />
      <div className="md:hidden">
        <WeekStripCard />
      </div>
      <SmartChips />
      {state.filter === 'today' && (
        <>
          <Section
            title="Today"
            actionLabel="Mark all read"
            onAction={() => actions.acknowledgeMany(todayItems.map(r => r.id))}
            items={todayItems}
            emptyText="All done for today 🎉"
          />
          {overdueItems.length > 0 && (
            <Section title="Overdue" actionLabel="View history" onAction={() => actions.setTab('history')} items={overdueItems} />
          )}
        </>
      )}
      {state.filter === 'tomorrow' && <Section title="Tomorrow" items={tomorrowItems} emptyText="Nothing scheduled tomorrow 🌙" />}
      {state.filter === 'week' && (
        <>
          <Section title="This week" items={weekItems} emptyText="A quiet week ahead" />
          {overdueItems.length > 0 && <Section title="Overdue" items={overdueItems} />}
        </>
      )}
      {state.filter === 'overdue' && (
        <Section
          title="Overdue"
          actionLabel="View history"
          onAction={() => actions.setTab('history')}
          items={overdueItems}
          emptyText="Nothing overdue — nice work ✅"
        />
      )}
      <div className="hidden gap-[18px] md:grid md:grid-cols-2 xl:hidden">
        <WeekStripCard />
        <PersonalAlarmCard />
        <ChannelsCard />
        <QuietHoursCard />
      </div>
    </>
  )
}

function dayLabel(offset: number) {
  if (offset === -1) return 'Yesterday'
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Tomorrow'
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return new Intl.DateTimeFormat('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
}

function CalendarView() {
  const { derived } = useStore()
  const dayGroups = useMemo(() => {
    const byDay = new Map<number, Reminder[]>()
    for (const r of [...derived.active].sort(sortByDayAndTime)) {
      byDay.set(r.dayOffset, [...(byDay.get(r.dayOffset) ?? []), r])
    }
    return [...byDay.entries()].sort((a, b) => a[0] - b[0])
  }, [derived.active])
  return (
    <>
      <WeekStripCard />
      {dayGroups.length === 0 ? (
        <div className="glass px-[18px] py-8 text-center text-[0.85rem] text-[color:var(--ink-faint)]">
          No upcoming reminders — enjoy the quiet 🎧
        </div>
      ) : (
        dayGroups.map(([offset, items]) => <Section key={offset} title={dayLabel(offset)} items={items} />)
      )}
    </>
  )
}

function DiscoverView() {
  const [query, setQuery] = useState('')
  const [subscribed, setSubscribed] = useState<Set<string>>(new Set())
  const q = query.trim().toLowerCase()
  const filtered = discoverEvents.filter(e => !q || e.title.toLowerCase().includes(q) || e.scope.toLowerCase().includes(q))
  const toggleSub = (id: string) =>
    setSubscribed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  return (
    <>
      <div className="glass flex items-center gap-2.5 px-4 py-3">
        <Search size={16} className="shrink-0 text-[color:var(--ink-faint)]" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search events to subscribe…"
          aria-label="Search events"
          className="w-full bg-transparent text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] md:text-[0.85rem]"
        />
      </div>
      {filtered.map(event => {
        const isSub = subscribed.has(event.id)
        return (
          <div key={event.id} className="glass flex flex-col gap-3 px-[18px] py-4 md:flex-row md:items-center md:gap-3.5">
            <div className="flex min-w-0 items-start gap-3.5 md:flex-1 md:items-center">
              <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-[1.05rem]" aria-hidden>
                {event.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.9rem] font-bold">{event.title}</span>
                  <span className="rounded-full bg-white/[0.12] px-2 py-[2px] text-[0.6rem] font-extrabold uppercase tracking-[0.05em] text-[color:var(--ink-dim)]">
                    {event.scope}
                  </span>
                </div>
                <div className="mt-[3px] text-[0.75rem] text-[color:var(--ink-faint)]">{event.meta}</div>
              </div>
            </div>
            <button
              onClick={() => toggleSub(event.id)}
              className={cn(
                'w-full cursor-pointer rounded-[10px] px-[13px] py-2 text-[0.72rem] font-bold transition md:w-auto md:shrink-0',
                isSub
                  ? 'border border-[color:var(--glass-border)] bg-white/[0.09] text-[color:var(--ink-dim)]'
                  : 'bg-[linear-gradient(135deg,var(--cyan),var(--violet))] text-[#1a1240] hover:brightness-110',
              )}
            >
              {isSub ? 'Subscribed ✓' : 'Subscribe'}
            </button>
          </div>
        )
      })}
      {filtered.length === 0 && (
        <div className="glass px-[18px] py-8 text-center text-[0.85rem] text-[color:var(--ink-faint)]">No events match "{query}"</div>
      )}
    </>
  )
}

function SectionLabel({ children }: { children: string }) {
  return <div className="px-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[color:var(--ink-faint)]">{children}</div>
}

function SettingsView() {
  const { user, isDemo, signOut } = useAuth()
  const { actions } = useStore()
  const navigate = useNavigate()
  const links: { tab: 'profile' | 'groups' | 'premium'; label: string; sub: string; icon: typeof User }[] = [
    { tab: 'profile', label: 'Profile', sub: 'Name, timezone, location', icon: User },
    { tab: 'groups', label: 'Groups', sub: 'Create groups and add members', icon: Users },
    { tab: 'premium', label: 'Premium', sub: 'Renewals, subscriptions, gifting', icon: Sparkles },
  ]
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-[1.05rem] font-bold">Settings</h2>
        <p className="text-[0.78rem] text-[color:var(--ink-dim)]">Manage your account, groups, and how you're notified.</p>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="flex flex-col gap-3">
          <SectionLabel>Account</SectionLabel>
          <button onClick={() => actions.setTab('profile')} className="glass flex w-full items-center gap-3 p-4 text-left transition hover:bg-white/[0.13]">
            <Avatar />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[0.85rem] font-bold">{user?.name ?? 'Priya Nair'}</div>
              <div className="truncate text-[0.72rem] text-[color:var(--ink-faint)]">{user?.email ?? 'demo@remindly.app'}</div>
            </div>
            <ChevronRight size={16} className="shrink-0 text-[color:var(--ink-faint)]" />
          </button>
          {links.map(l => (
            <button key={l.tab} onClick={() => actions.setTab(l.tab)} className="glass flex w-full items-center gap-3 px-[18px] py-3.5 text-left transition hover:bg-white/[0.13]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-white/[0.1]">
                <l.icon size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[0.85rem] font-semibold">{l.label}</div>
                <div className="text-[0.72rem] text-[color:var(--ink-faint)]">{l.sub}</div>
              </div>
              <ChevronRight size={16} className="shrink-0 text-[color:var(--ink-faint)]" />
            </button>
          ))}
          {isDemo && (
            <div className="glass px-[18px] py-3 text-[0.75rem] leading-relaxed text-[color:var(--ink-faint)]">
              Running in demo mode — connect Supabase (see README) to enable real accounts and saved data.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <SectionLabel>Preferences</SectionLabel>
          <PersonalAlarmCard />
          <ChannelsCard />
          <QuietHoursCard />
        </div>
      </div>

      <button
        onClick={async () => {
          await signOut()
          navigate('/')
        }}
        className="flex cursor-pointer items-center justify-center gap-2 self-start rounded-full border border-[color:var(--glass-border)] bg-white/[0.06] px-5 py-2.5 text-[0.82rem] font-semibold text-[color:var(--ink-dim)] transition hover:border-[rgba(255,107,107,0.4)] hover:text-[color:var(--red)]"
      >
        <LogOut size={15} /> Sign out
      </button>
    </div>
  )
}

function StubView({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="glass flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="text-4xl" aria-hidden>
        {icon}
      </span>
      <h2 className="font-display text-base font-bold">{title}</h2>
      <p className="max-w-sm text-[0.8rem] text-[color:var(--ink-dim)]">{text}</p>
    </div>
  )
}

export function ViewSwitch() {
  const { state } = useStore()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state.tab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col gap-[18px]"
      >
        {state.tab === 'today' && <TodayView />}
        {state.tab === 'calendar' && <CalendarView />}
        {state.tab === 'discover' && <DiscoverView />}
        {state.tab === 'groups' && <GroupsView />}
        {state.tab === 'workspace' && <WorkspaceView />}
        {state.tab === 'premium' && <PremiumView />}
        {state.tab === 'profile' && <ProfileView />}
        {state.tab === 'settings' && <SettingsView />}
        {state.tab === 'notifications' && (
          <StubView
            icon="🔔"
            title="Notification inbox"
            text="Your unread notifications and delivery history arrive with the Phase 2 notification centre."
          />
        )}
        {state.tab === 'history' && (
          <StubView icon="📜" title="Reminder history" text="A filterable log of every notification, channel and action lands here in Phase 2." />
        )}
      </motion.div>
    </AnimatePresence>
  )
}
