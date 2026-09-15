import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, Compass } from 'lucide-react'
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

export function TodayView() {
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
            <Section title="Overdue" actionLabel="View history" onAction={() => actions.openTab('inbox', 'history')} items={overdueItems} />
          )}
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
