import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlarmClockOff, CalendarDays, ChevronDown, Compass, Plus } from 'lucide-react'
import { snoozeLabel } from '../lib/snooze'
import { GreetingHero } from '../components/GreetingHero'
import { QuietHoursCard, WeekStripCard } from '../components/RailCards'
import { Section } from '../components/Section'
import { SegmentBar, useSegment } from '../components/SegmentBar'
import { SmartChips } from '../components/SmartChips'
import { timeMinutes, useStore } from '../store'
import type { Reminder } from '../types'
import { AdminView } from './AdminView'
import { BusinessView } from './BusinessView'
import { CalendarView } from './CalendarView'
import { DiscoverView } from './DiscoverView'
import { FinanceView } from './FinanceView'
import { GroupsView } from './GroupsView'
import { InboxView } from './InboxView'
import { SettingsView } from './SettingsView'
import { UpgradeView } from './UpgradeView'
import { WorkspaceView } from './WorkspaceView'

function sortByDayAndTime(a: Reminder, b: Reminder) {
  return a.dayOffset - b.dayOffset || timeMinutes(a.time) - timeMinutes(b.time)
}

function SnoozedSection() {
  const { derived, actions } = useStore()
  const [open, setOpen] = useState(false)
  if (derived.snoozed.length === 0) return null
  return (
    <section className="flex flex-col">
      <button onClick={() => setOpen(v => !v)} className="mb-2 flex items-center gap-2 px-1 text-left text-[0.9rem] font-bold" aria-expanded={open}>
        <ChevronDown size={15} className={open ? '' : '-rotate-90'} style={{ transition: 'transform 0.15s' }} />
        Snoozed <span className="badge bg-[color:var(--subtle)] text-[color:var(--ink-faint)]">{derived.snoozed.length}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2">
          {derived.snoozed.map(r => (
            <div key={r.id} className="card flex items-center gap-3 px-4 py-3">
              <span className="text-[1rem]" aria-hidden>{r.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.85rem] font-semibold">{r.title}</div>
                <div className="text-[0.72rem] text-[color:var(--ink-faint)]">Snoozed {r.snoozedUntil ? snoozeLabel(r.snoozedUntil) : ''}</div>
              </div>
              <button onClick={() => actions.unsnooze(r.id)} className="btn-ghost px-2.5 py-1.5 text-[0.74rem]">
                <AlarmClockOff size={13} /> Bring back
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function FirstRun() {
  const { actions } = useStore()
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="text-3xl" aria-hidden>🌱</span>
      <h3 className="font-display text-[1rem] font-bold">Nothing here yet</h3>
      <p className="max-w-sm text-[0.82rem] text-[color:var(--ink-dim)]">
        Add your first reminder in plain English — "call the dentist tomorrow at 10am", "pay rent every month on the 1st".
      </p>
      <button onClick={() => actions.setQuickAdd(true)} className="btn-primary md:hidden">
        <Plus size={15} /> Add a reminder
      </button>
    </div>
  )
}

export function TodayView() {
  const { state, derived, actions } = useStore()
  const todayItems = derived.active.filter(r => r.dayOffset === 0)
  const tomorrowItems = derived.active.filter(r => r.dayOffset === 1).sort(sortByDayAndTime)
  const weekItems = derived.active.filter(r => r.dayOffset >= 0 && r.dayOffset <= 6).sort(sortByDayAndTime)
  const overdueItems = derived.active.filter(r => r.dayOffset < 0)
  if (state.reminders.length === 0) {
    return (
      <>
        <GreetingHero />
        <FirstRun />
      </>
    )
  }
  return (
    <>
      <GreetingHero />
      <div className="md:hidden">
        <WeekStripCard />
      </div>
      <SmartChips />
      {state.filter === 'today' && (
        <>
          {overdueItems.length > 0 && (
            <Section title="Overdue" actionLabel="View history" onAction={() => actions.openTab('inbox', 'history')} items={overdueItems} />
          )}
          <Section
            title="Today"
            actionLabel={todayItems.length > 0 ? 'Mark all done' : undefined}
            onAction={() => actions.acknowledgeMany(todayItems.map(r => r.id))}
            items={todayItems}
            emptyText="All done for today"
          />
          <SnoozedSection />
        </>
      )}
      {state.filter === 'tomorrow' && <Section title="Tomorrow" items={tomorrowItems} emptyText="Nothing scheduled tomorrow 🌙" />}
      {state.filter === 'week' && (
        <>
          <Section title="Next 7 days" items={weekItems} emptyText="A quiet week ahead" />
          {overdueItems.length > 0 && <Section title="Overdue" items={overdueItems} />}
        </>
      )}
      {state.filter === 'overdue' && (
        <Section
          title="Overdue"
          actionLabel="View history"
          onAction={() => actions.openTab('inbox', 'history')}
          items={overdueItems}
          emptyText="Nothing overdue — nice work ✅"
        />
      )}
      <div className="hidden gap-[18px] md:grid md:grid-cols-2 xl:hidden">
        <WeekStripCard />
        <QuietHoursCard />
      </div>
    </>
  )
}

const CALENDAR_SEGMENTS = ['calendar', 'discover'] as const

function CalendarTab() {
  const [segment, setSegment] = useSegment(CALENDAR_SEGMENTS, 'calendar')
  return (
    <>
      <SegmentBar
        label="Calendar sections"
        value={segment}
        onChange={setSegment}
        segments={[
          { key: 'calendar', label: 'Calendar', icon: CalendarDays },
          { key: 'discover', label: 'Discover', icon: Compass },
        ]}
      />
      {segment === 'calendar' ? <CalendarView /> : <DiscoverView />}
    </>
  )
}

export function ViewSwitch() {
  const { state } = useStore()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state.tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.16 }}
        className="flex flex-col gap-4"
      >
        {state.tab === 'today' && <TodayView />}
        {state.tab === 'calendar' && <CalendarTab />}
        {state.tab === 'workspace' && <WorkspaceView />}
        {state.tab === 'groups' && <GroupsView />}
        {state.tab === 'finance' && <FinanceView />}
        {state.tab === 'business' && <BusinessView />}
        {state.tab === 'inbox' && <InboxView />}
        {state.tab === 'settings' && <SettingsView />}
        {state.tab === 'admin' && <AdminView />}
        {state.tab === 'upgrade' && <UpgradeView />}
      </motion.div>
    </AnimatePresence>
  )
}
