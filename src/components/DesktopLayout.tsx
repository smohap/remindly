import { ViewSwitch } from '../views/Views'
import { AppFooter } from './AppFooter'
import { ChannelsCard, PersonalAlarmCard, QuietHoursCard, WeekStripCard } from './RailCards'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function DesktopLayout() {
  return (
    <div className="relative z-10 mx-auto grid max-w-[1400px] grid-cols-[80px_1fr] items-start gap-5 p-7 xl:grid-cols-[230px_1fr_300px]">
      {/* Everything scrolls together as a single page — no sticky panes,
          so the sidebar's profile card and Sign out are always reachable. */}
      <Sidebar />

      <main className="flex min-w-0 flex-col gap-[18px]">
        <TopBar />
        <ViewSwitch />
      </main>

      <aside className="hidden flex-col gap-[18px] xl:flex" aria-label="Preferences and calendar">
        <WeekStripCard />
        <PersonalAlarmCard />
        <ChannelsCard />
        <QuietHoursCard />
      </aside>

      {/* Spans every column so it sits at the foot of the page, not under the
          middle column. */}
      <div className="col-span-full">
        <AppFooter />
      </div>
    </div>
  )
}
