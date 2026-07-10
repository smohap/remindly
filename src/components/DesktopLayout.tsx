import { ViewSwitch } from '../views/Views'
import { ChannelsCard, PersonalAlarmCard, QuietHoursCard, WeekStripCard } from './RailCards'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function DesktopLayout() {
  return (
    <div className="relative z-10 mx-auto grid h-dvh min-h-[760px] max-w-[1400px] grid-cols-[80px_1fr] gap-5 p-7 xl:grid-cols-[230px_1fr_300px]">
      <Sidebar />
      <main className="flex min-h-0 flex-col gap-[18px]">
        <TopBar />
        <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto pr-0.5">
          <ViewSwitch />
        </div>
      </main>
      <aside className="scroll-thin hidden min-h-0 flex-col gap-[18px] overflow-y-auto xl:flex" aria-label="Preferences and calendar">
        <WeekStripCard />
        <PersonalAlarmCard />
        <ChannelsCard />
        <QuietHoursCard />
      </aside>
    </div>
  )
}
