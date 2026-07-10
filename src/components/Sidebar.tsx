import { Bell, CalendarDays, ScrollText, Search, Settings, Sun } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { groups } from '../data'
import { cn } from '../lib/cn'
import { useStore } from '../store'
import type { Tab } from '../types'
import { Avatar } from './Avatar'

const NAV: { key: Tab; label: string; icon: typeof Sun }[] = [
  { key: 'today', label: 'Today', icon: Sun },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'discover', label: 'Discover', icon: Search },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'history', label: 'History', icon: ScrollText },
  { key: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { state, derived, actions } = useStore()
  const { user } = useAuth()
  return (
    <aside className="glass flex min-h-0 flex-col gap-7 px-3 py-[26px] xl:px-[18px]">
      <div className="font-display flex items-center justify-center gap-[9px] px-1.5 text-[1.3rem] font-extrabold xl:justify-start">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] shadow-[0_0_14px_var(--cyan)]" />
        <span className="hidden xl:inline">Remindly</span>
      </div>
      <nav className="flex flex-col gap-1" aria-label="Main">
        {NAV.map(item => {
          const active = state.tab === item.key
          const count = item.key === 'today' ? derived.counts.today : item.key === 'notifications' ? 5 : 0
          return (
            <button
              key={item.key}
              onClick={() => actions.setTab(item.key)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex cursor-pointer items-center justify-center gap-3 rounded-[13px] px-3.5 py-[11px] text-[0.86rem] font-semibold transition-colors xl:justify-start',
                active
                  ? 'bg-[color:var(--glass-strong)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                  : 'text-[color:var(--ink-dim)] hover:bg-white/[0.08] hover:text-white',
              )}
            >
              <item.icon size={17} className="shrink-0" />
              <span className="hidden xl:inline">{item.label}</span>
              {count > 0 && (
                <span className="ml-auto hidden rounded-full bg-white/[0.18] px-[7px] py-[2px] text-[0.68rem] font-bold xl:inline">{count}</span>
              )}
            </button>
          )
        })}
      </nav>
      <div className="hidden xl:block">
        <div className="px-3.5 pb-2 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">Your groups</div>
        {groups.map(g => (
          <div key={g.name} className="flex items-center gap-2.5 rounded-xl px-3.5 py-[9px] text-[0.8rem] font-medium text-[color:var(--ink-dim)]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: g.color }} />
            {g.name}
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-center gap-2.5 rounded-2xl border border-[color:var(--glass-border)] bg-white/[0.07] p-3 xl:justify-start">
        <Avatar />
        <div className="hidden min-w-0 leading-tight xl:block">
          <div className="truncate text-[0.82rem] font-bold">{user?.name ?? 'Priya Nair'}</div>
          <div className="truncate text-[0.7rem] text-[color:var(--ink-faint)]">{user?.email ?? 'User · Auckland, NZ'}</div>
        </div>
      </div>
    </aside>
  )
}
