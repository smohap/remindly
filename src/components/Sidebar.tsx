import { Briefcase, CalendarDays, Inbox, LayoutGrid, Lock, LogOut, Settings, ShieldCheck, Sun, Users, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useActivity } from '../lib/activityStore'
import { cn } from '../lib/cn'
import type { Feature } from '../lib/plans'
import { useMyRole } from '../lib/useAdmin'
import { useGroups } from '../lib/useGroups'
import { usePlan } from '../lib/usePlan'
import { useStore } from '../store'
import type { Tab } from '../types'
import { Avatar } from './Avatar'

/** The eight top-level destinations. Locked ones still open — onto a gate. */
const NAV: { key: Tab; label: string; icon: typeof Sun; feature?: Feature }[] = [
  { key: 'today', label: 'Today', icon: Sun },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'workspace', label: 'Workspace', icon: LayoutGrid },
  { key: 'groups', label: 'Groups', icon: Users },
  { key: 'finance', label: 'Finance', icon: Wallet, feature: 'invoices' },
  { key: 'business', label: 'Business', icon: Briefcase, feature: 'business' },
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'settings', label: 'Settings', icon: Settings },
]

const ADMIN_NAV = { key: 'admin' as const, label: 'Admin', icon: ShieldCheck }

export function Sidebar() {
  const { state, derived, actions } = useStore()
  const { user, signOut } = useAuth()
  const { isAdmin } = useMyRole()
  const { can } = usePlan()
  const { unread } = useActivity()
  const { pendingCount } = useGroups()
  const navigate = useNavigate()

  // Admins get one extra entry. This only controls visibility — the server
  // decides what an admin may actually do.
  const nav = isAdmin ? [...NAV, ADMIN_NAV] : NAV

  return (
    <aside className="card flex flex-col gap-6 px-3 py-6 xl:px-4">
      <div className="flex items-center justify-center px-1.5 xl:justify-start">
        <img src="/neuroli-icon.webp" alt="" className="h-8 w-8 rounded-[9px] xl:hidden" />
        <img src="/neuroli-logo.png" alt="Neuroli" className="hidden h-11 w-auto rounded-xl bg-white/92 px-3 py-1 xl:block" />
      </div>
      <nav className="flex flex-col gap-0.5" aria-label="Main">
        {nav.map(item => {
          const active = state.tab === item.key || (state.tab === 'upgrade' && state.upgradeReturnTab === item.key)
          const count = item.key === 'today' ? derived.counts.today : item.key === 'inbox' ? unread : item.key === 'groups' ? pendingCount : 0
          const locked = 'feature' in item && item.feature ? !can(item.feature) : false
          return (
            <button
              key={item.key}
              onClick={() => actions.setTab(item.key)}
              aria-current={active ? 'page' : undefined}
              title={item.label}
              className={cn(
                'flex cursor-pointer items-center justify-center gap-3 rounded-[10px] px-3 py-2.5 text-[0.85rem] font-medium transition-colors xl:justify-start',
                active ? 'bg-[color:var(--surface-2)] text-[color:var(--ink)]' : 'text-[color:var(--ink-dim)] hover:bg-[color:var(--hover)] hover:text-[color:var(--ink)]',
              )}
            >
              <item.icon size={17} className="shrink-0" />
              <span className="hidden xl:inline">{item.label}</span>
              {locked && <Lock size={11} className="ml-auto hidden text-[color:var(--ink-faint)] xl:inline" />}
              {count > 0 && (
                <span className="ml-auto hidden rounded-full bg-[color:var(--accent-soft)] px-[7px] py-[2px] text-[0.68rem] font-bold text-[color:var(--accent)] xl:inline">{count}</span>
              )}
            </button>
          )
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-2">
        <button
          onClick={() => actions.openTab('settings', 'profile')}
          className="flex items-center justify-center gap-2.5 rounded-[12px] border border-[color:var(--border)] p-2.5 text-left transition hover:bg-[color:var(--hover)] xl:justify-start"
        >
          <Avatar />
          <div className="hidden min-w-0 leading-tight xl:block">
            <div className="truncate text-[0.82rem] font-semibold">{user?.name ?? 'You'}</div>
            <div className="truncate text-[0.7rem] text-[color:var(--ink-faint)]">{user?.email ?? ''}</div>
          </div>
        </button>
        <button
          onClick={async () => {
            await signOut()
            navigate('/')
          }}
          aria-label="Sign out"
          className="btn-ghost justify-center xl:justify-start"
        >
          <LogOut size={15} className="shrink-0" />
          <span className="hidden xl:inline">Sign out</span>
        </button>
      </div>
    </aside>
  )
}
