import { ViewSwitch } from '../views/Views'
import { AppFooter } from './AppFooter'
import { ChannelsCard, PersonalAlarmCard, QuietHoursCard, WeekStripCard } from './RailCards'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function DesktopLayout() {
  return (
    <div className="relative z-10 mx-auto grid max-w-[1400px] grid-cols-[80px_1fr] items-start gap-5 p-7 xl:grid-cols-[230px_1fr_300px]">
      {/* Sidebar sticks while the page scrolls as a whole */}
      <div className="sticky top-7 max-h-[calc(100dvh-56px)]">
        <Sidebar />
      </div>

      <main className="flex min-w-0 flex-col gap-[18px]">
        <TopBar />
        <ViewSwitch />
        <AppFooter />
      </main>

      <aside className="sticky top-7 hidden flex-col gap-[18px] xl:flex" aria-label="Preferences and calendar">
        <WeekStripCard />
        <PersonalAlarmCard />
        <ChannelsCard />
        <QuietHoursCard />
      </aside>
    </div>
  )
}
