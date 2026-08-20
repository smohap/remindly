import { useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Briefcase, CalendarDays, ChevronRight, FileText, GanttChartSquare, LayoutGrid, LogOut, MoreHorizontal,
  Plus, ScrollText, Search, Settings, ShieldCheck, Sparkles, Sun, User, Users,
} from 'lucide-react'
import { useMyRole } from '../lib/useAdmin'
import { BottomSheet } from './BottomSheet'
import { useAuth } from '../auth/AuthContext'
import { cn } from '../lib/cn'
import { useStore } from '../store'
import type { Tab } from '../types'
import { ViewSwitch } from '../views/Views'
import { AppFooter } from './AppFooter'
import { Avatar } from './Avatar'

const TABS: { key: Tab; label: string; icon: typeof Sun }[] = [
  { key: 'today', label: 'Today', icon: Sun },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'workspace', label: 'Workspace', icon: LayoutGrid },
]

/** Everything that doesn't fit in the tab bar, reachable from "More". */
const MORE_ITEMS: { key: Tab; label: string; sub: string; icon: typeof Sun }[] = [
  { key: 'planner', label: 'Plans', sub: 'Events, projects and Gantt charts', icon: GanttChartSquare },
  { key: 'business', label: 'Business', sub: 'Certifications, contracts, filings', icon: Briefcase },
  { key: 'invoices', label: 'Invoices', sub: 'Send, settle and track invoices', icon: FileText },
  { key: 'groups', label: 'Groups', sub: 'Members and group chat', icon: Users },
  { key: 'premium', label: 'Premium', sub: 'Vault, subscriptions, calendar sync', icon: Sparkles },
  { key: 'discover', label: 'Discover', sub: 'Subscribe to events', icon: Search },
  { key: 'notifications', label: 'Notifications', sub: 'Your inbox', icon: Bell },
  { key: 'history', label: 'History', sub: 'Past reminders', icon: ScrollText },
  { key: 'profile', label: 'Profile', sub: 'Your details', icon: User },
  { key: 'settings', label: 'Settings', sub: 'Preferences and sign out', icon: Settings },
]

/** Shown only to admins; the server still enforces what they may do. */
const ADMIN_ITEM = { key: 'admin' as const, label: 'Admin', sub: 'People, groups and audit log', icon: ShieldCheck }

function MobileHeader({ compact }: { compact: boolean }) {
  const { actions } = useStore()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <motion.header
      className="glass-solid relative z-40 mx-3 flex items-center justify-between px-4"
      style={{ marginTop: 'calc(env(safe-area-inset-top) + 8px)' }}
      animate={{ paddingTop: compact ? 8 : 13, paddingBottom: compact ? 8 : 13 }}
    >
      <button aria-label="Profile" onClick={() => actions.setTab('profile')} className="cursor-pointer">
        <Avatar size={34} />
      </button>
      <div className="font-display flex items-center gap-2 text-base font-extrabold">
        <span className="h-2.5 w-2.5 rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] shadow-[0_0_14px_var(--cyan)]" />
        Remindly
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          onClick={() => actions.setTab('notifications')}
          className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-[12px] border border-[color:var(--glass-border)] bg-white/[0.08]"
        >
          <Bell size={17} />
        </button>
        <button
          aria-label="Sign out"
          onClick={async () => {
            await signOut()
            navigate('/')
          }}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[12px] border border-[color:var(--glass-border)] bg-white/[0.08] text-[color:var(--ink-dim)] transition hover:text-[color:var(--red)]"
        >
          <LogOut size={17} />
        </button>
      </div>
    </motion.header>
  )
}

function MobileTabBar({ onMore, moreActive }: { onMore: () => void; moreActive: boolean }) {
  const { state, actions } = useStore()
  const renderTab = (t: (typeof TABS)[number]) => {
    const active = state.tab === t.key
    return (
      <button
        key={t.key}
        onClick={() => actions.setTab(t.key)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex min-h-11 min-w-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1 transition-colors',
          active ? 'text-white' : 'text-[color:var(--ink-faint)]',
        )}
      >
        <t.icon size={20} />
        <span className="text-[0.6rem] font-semibold">{t.label}</span>
        <span className="relative h-1 w-1">
          {active && <motion.span layoutId="tab-dot" className="absolute inset-0 rounded-full bg-[color:var(--cyan)]" />}
        </span>
      </button>
    )
  }
  return (
    <nav
      aria-label="Primary"
      className="glass-solid fixed inset-x-0 bottom-0 z-50 flex items-end justify-around rounded-none rounded-t-[26px] border-x-0 border-b-0 px-2 pt-2"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
    >
      {TABS.slice(0, 2).map(renderTab)}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => actions.setQuickAdd(true)}
        aria-label="Add reminder"
        className="-mt-8 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] text-[#1a1240] shadow-[0_8px_24px_rgba(124,111,255,0.5)]"
      >
        <Plus size={26} strokeWidth={2.5} />
      </motion.button>
      {TABS.slice(2).map(renderTab)}
      <button
        onClick={onMore}
        aria-label="More sections"
        className={cn(
          'flex min-h-11 min-w-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1 transition-colors',
          moreActive ? 'text-white' : 'text-[color:var(--ink-faint)]',
        )}
      >
        <MoreHorizontal size={20} />
        <span className="text-[0.6rem] font-semibold">More</span>
        <span className="relative h-1 w-1">
          {moreActive && <motion.span layoutId="tab-dot" className="absolute inset-0 rounded-full bg-[color:var(--cyan)]" />}
        </span>
      </button>
    </nav>
  )
}

export function MobileLayout() {
  const [compact, setCompact] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const { state, actions } = useStore()
  const { isAdmin } = useMyRole()
  const moreItems = isAdmin ? [...MORE_ITEMS, ADMIN_ITEM] : MORE_ITEMS
  const moreActive = moreItems.some(i => i.key === state.tab)

  return (
    <div className="relative z-10 flex h-dvh flex-col">
      <MobileHeader compact={compact} />
      <div className="scrollbar-hidden flex-1 overflow-y-auto px-4 pb-32 pt-4" onScroll={e => setCompact(e.currentTarget.scrollTop > 24)}>
        <ViewSwitch />
        <AppFooter />
      </div>
      <MobileTabBar onMore={() => setMoreOpen(true)} moreActive={moreActive} />

      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} label="All sections">
        <h3 className="font-display mb-3 text-base font-bold">All sections</h3>
        <div className="flex flex-col gap-1.5">
          {moreItems.map(item => {
            const active = state.tab === item.key
            return (
              <button
                key={item.key}
                onClick={() => {
                  actions.setTab(item.key)
                  setMoreOpen(false)
                }}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition',
                  active ? 'bg-[color:var(--glass-strong)]' : 'bg-white/[0.06] hover:bg-white/[0.12]',
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white/10">
                  <item.icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.88rem] font-semibold">{item.label}</span>
                  <span className="block truncate text-[0.72rem] text-[color:var(--ink-faint)]">{item.sub}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-[color:var(--ink-faint)]" />
              </button>
            )
          })}
        </div>
      </BottomSheet>
    </div>
  )
}
