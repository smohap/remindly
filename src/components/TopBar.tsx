import { Bell, Settings } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useStore } from '../store'

function IconButton({ children, label, onClick, badge }: { children: ReactNode; label: string; onClick: () => void; badge?: number }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[12px] border border-[color:var(--glass-border)] bg-white/[0.08] transition hover:bg-white/[0.14]"
    >
      {children}
      {badge ? (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--red)] text-[0.6rem] font-extrabold shadow-[0_0_0_2px_rgba(42,33,102,0.9)]">
          {badge}
        </span>
      ) : null}
    </button>
  )
}

export function TopBar() {
  const { actions } = useStore()
  const [text, setText] = useState('')
  return (
    <div className="glass flex items-center gap-4 px-[22px] py-3.5">
      <form
        className="flex flex-1 items-center gap-2.5 rounded-[14px] border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-2.5"
        onSubmit={e => {
          e.preventDefault()
          actions.add(text)
          setText('')
        }}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] bg-[linear-gradient(135deg,var(--cyan),var(--violet))] text-[0.8rem] font-bold text-[#1a1240]" aria-hidden>
          +
        </span>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          aria-label="Quick add a reminder"
          placeholder='Try "remind me every second Tuesday at 9am"…'
          className="w-full bg-transparent text-[0.85rem] text-white outline-none placeholder:text-[color:var(--ink-faint)]"
        />
      </form>
      <IconButton label="Notifications" onClick={() => actions.setTab('notifications')} badge={5}>
        <Bell size={17} />
      </IconButton>
      <IconButton label="Settings" onClick={() => actions.setTab('settings')}>
        <Settings size={17} />
      </IconButton>
    </div>
  )
}
