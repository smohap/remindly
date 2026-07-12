import { useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, LogOut, Plus, Search, Settings, Sun } from 'lucide-react'
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
  { key: 'discover', label: 'Discover', icon: Search },
  { key: 'settings', label: 'Settings', icon: Settings },
]

function MobileHeader({ compact }: { compact: boolean }) {
  const { actions } = useStore()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <motion.header
      className="glass relative z-40 mx-3 flex items-center justify-between px-4"
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
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--red)] text-[0.6rem] font-extrabold shadow-[0_0_0_2px_rgba(42,33,102,0.9)]">
            5
          </span>
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

function MobileTabBar() {
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
      className="glass fixed inset-x-0 bottom-0 z-50 flex items-end justify-around rounded-none rounded-t-[26px] border-x-0 border-b-0 px-2 pt-2"
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
    </nav>
  )
}

export function MobileLayout() {
  const [compact, setCompact] = useState(false)
  return (
    <div className="relative z-10 flex h-dvh flex-col">
      <MobileHeader compact={compact} />
      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-4" onScroll={e => setCompact(e.currentTarget.scrollTop > 24)}>
        <ViewSwitch />
        <AppFooter />
      </div>
      <MobileTabBar />
    </div>
  )
}
