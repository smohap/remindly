import { ViewSwitch } from '../views/Views'
import { AppFooter } from './AppFooter'
import { QuietHoursCard, WeekStripCard } from './RailCards'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function DesktopLayout() {
  return (
    <div className="relative z-10 mx-auto grid max-w-[1400px] grid-cols-[72px_1fr] items-start gap-5 p-6 xl:grid-cols-[210px_1fr_280px]">
      {/* Everything scrolls together as a single page — no sticky panes,
          so the sidebar's profile card and Sign out are always reachable. */}
      <Sidebar />

      <main className="flex min-w-0 flex-col gap-4">
        <TopBar />
        <ViewSwitch />
      </main>

      <aside className="hidden flex-col gap-4 xl:flex" aria-label="Preferences and calendar">
        <WeekStripCard />
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
