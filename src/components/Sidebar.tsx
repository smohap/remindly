import { Bell, CalendarDays, LogOut, ScrollText, Search, Settings, Sparkles, Sun, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { cn } from '../lib/cn'
import { useGroups } from '../lib/useGroups'
import { useStore } from '../store'
import type { Tab } from '../types'
import { Avatar } from './Avatar'

const NAV: { key: Tab; label: string; icon: typeof Sun }[] = [
  { key: 'today', label: 'Today', icon: Sun },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'discover', label: 'Discover', icon: Search },
  { key: 'groups', label: 'Groups', icon: Users },
  { key: 'premium', label: 'Premium', icon: Sparkles },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'history', label: 'History', icon: ScrollText },
  { key: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { state, derived, actions } = useStore()
  const { user, signOut } = useAuth()
  const { groups } = useGroups()
  const navigate = useNavigate()

  return (
    <aside className="glass flex min-h-0 flex-col gap-6 px-3 py-[26px] xl:px-[18px]">
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
      <div className="scrollbar-hidden hidden min-h-0 flex-1 overflow-y-auto xl:block">
        <button
          onClick={() => actions.setTab('groups')}
          className="mb-1 flex w-full items-center justify-between px-3.5 pb-2 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)] transition hover:text-white"
        >
          Your groups <span className="text-[0.7rem]">+</span>
        </button>
        {groups.map(g => (
          <button
            key={g.id}
            onClick={() => actions.setTab('groups')}
            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-[9px] text-left text-[0.8rem] font-medium text-[color:var(--ink-dim)] transition hover:bg-white/[0.06] hover:text-white"
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: g.color }} />
            <span className="truncate">{g.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <button
          onClick={() => actions.setTab('profile')}
          aria-current={state.tab === 'profile' ? 'page' : undefined}
          className={cn(
            'flex items-center justify-center gap-2.5 rounded-2xl border border-[color:var(--glass-border)] p-3 text-left transition xl:justify-start',
            state.tab === 'profile' ? 'bg-[color:var(--glass-strong)]' : 'bg-white/[0.07] hover:bg-white/[0.12]',
          )}
        >
          <Avatar />
          <div className="hidden min-w-0 leading-tight xl:block">
            <div className="truncate text-[0.82rem] font-bold">{user?.name ?? 'Priya Nair'}</div>
            <div className="truncate text-[0.7rem] text-[color:var(--ink-faint)]">{user?.email ?? 'Auckland, NZ'}</div>
          </div>
        </button>
        <button
          onClick={async () => {
            await signOut()
            navigate('/')
          }}
          aria-label="Sign out"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[color:var(--glass-border)] bg-white/[0.04] py-2.5 text-[0.78rem] font-semibold text-[color:var(--ink-dim)] transition hover:text-[color:var(--red)] xl:justify-start xl:px-3.5"
        >
          <LogOut size={15} className="shrink-0" />
          <span className="hidden xl:inline">Sign out</span>
        </button>
      </div>
    </aside>
  )
}
