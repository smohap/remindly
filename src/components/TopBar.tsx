import { Bell, Plus, Settings } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useActivity } from '../lib/activityStore'
import { useStore } from '../store'

function IconButton({ children, label, onClick, badge, active }: { children: ReactNode; label: string; onClick: () => void; badge?: number; active?: boolean }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={
        'relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-[color:var(--border)] transition hover:bg-white/[0.06] ' +
        (active ? 'bg-[color:var(--surface-2)] text-[color:var(--ink)]' : 'text-[color:var(--ink-dim)]')
      }
    >
      {children}
      {badge ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--accent)] px-1 text-[0.6rem] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  )
}

export function TopBar() {
  const { state, actions } = useStore()
  const { unread } = useActivity()
  const [text, setText] = useState('')
  return (
    <div className="flex items-center gap-3">
      <form
        className="card flex flex-1 items-center gap-2.5 px-4 py-2.5 focus-within:border-[color:var(--accent)]"
        onSubmit={e => {
          e.preventDefault()
          actions.add(text)
          setText('')
        }}
      >
        <Plus size={16} className="shrink-0 text-[color:var(--ink-faint)]" aria-hidden />
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          aria-label="Quick add a reminder"
          placeholder='Add a reminder — try "pay rent every month on the 1st at 9am"'
          className="w-full bg-transparent text-[0.85rem] text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-faint)]"
        />
      </form>
      <IconButton label="Inbox" onClick={() => actions.setTab('inbox')} badge={unread} active={state.tab === 'inbox'}>
        <Bell size={17} />
      </IconButton>
      <IconButton label="Settings" onClick={() => actions.setTab('settings')} active={state.tab === 'settings'}>
        <Settings size={17} />
      </IconButton>
    </div>
  )
}
