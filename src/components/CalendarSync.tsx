import { Check, Link2, RefreshCw, Unlink } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { cn } from '../lib/cn'
import { DIRECTIONS, PROVIDERS, formatSynced, useCalendarSync, type SyncDirection } from '../lib/useCalendarSync'

export function CalendarSync() {
  const { state, connect, disconnect, setDirection, syncNow, connectedCount } = useCalendarSync()
  const { user } = useAuth()
  const account = user?.email ?? 'demo@remindly.app'

  return (
    <div className="flex flex-col gap-3">
      <div className="glass flex items-center justify-between gap-4 p-5">
        <div>
          <div className="text-[0.7rem] uppercase tracking-[0.08em] text-[color:var(--ink-faint)]">Connected calendars</div>
          <div className="font-display text-[1.6rem] font-extrabold leading-tight">
            {connectedCount}<span className="text-[0.8rem] font-semibold text-[color:var(--ink-dim)]"> of {PROVIDERS.length}</span>
          </div>
          <p className="mt-1 text-[0.74rem] text-[color:var(--ink-faint)]">
            Keep Remindly reminders and your calendar events in step, both ways.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-2.5 py-1 text-[0.6rem] font-extrabold uppercase tracking-[0.08em] text-[#1a1240]">
          Premium
        </span>
      </div>

      {PROVIDERS.map(p => {
        const conn = state[p.id]
        return (
          <div key={p.id} className="glass flex flex-col gap-3 p-5">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-[1.2rem]" style={{ background: `${p.color}22` }} aria-hidden>
                {p.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.92rem] font-bold">{p.name}</span>
                  {conn.connected && (
                    <span className="flex items-center gap-1 rounded-full bg-[rgba(45,212,191,0.18)] px-2 py-[2px] text-[0.6rem] font-extrabold uppercase tracking-[0.05em] text-[#7BE9D8]">
                      <Check size={10} /> Connected
                    </span>
                  )}
                </div>
                <div className="truncate text-[0.75rem] text-[color:var(--ink-faint)]">
                  {conn.connected ? `${conn.account} · ${formatSynced(conn.lastSyncedAt)}` : p.blurb}
                </div>
              </div>
              {conn.connected ? (
                <button
                  onClick={() => disconnect(p.id)}
                  className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[color:var(--glass-border)] bg-white/[0.08] px-3.5 py-2 text-[0.75rem] font-semibold text-[color:var(--ink-dim)] transition hover:text-[color:var(--red)]"
                >
                  <Unlink size={14} /> Disconnect
                </button>
              ) : (
                <button
                  onClick={() => connect(p.id, account)}
                  className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-3.5 py-2 text-[0.75rem] font-bold text-[#1a1240] transition hover:brightness-110"
                >
                  <Link2 size={14} /> Connect
                </button>
              )}
            </div>

            {conn.connected && (
              <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                <span className="text-[0.72rem] font-semibold text-[color:var(--ink-dim)]">Sync</span>
                <div className="flex gap-1">
                  {DIRECTIONS.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setDirection(p.id, d.value as SyncDirection)}
                      className={cn(
                        'cursor-pointer rounded-full px-3 py-1.5 text-[0.72rem] font-semibold transition',
                        conn.direction === d.value
                          ? 'bg-[color:var(--glass-strong)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                          : 'text-[color:var(--ink-faint)] hover:text-[color:var(--ink-dim)]',
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => syncNow(p.id)}
                  className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-full border border-[color:var(--glass-border)] bg-white/[0.06] px-3.5 py-1.5 text-[0.72rem] font-semibold text-[color:var(--ink-dim)] transition hover:text-white"
                >
                  <RefreshCw size={13} /> Sync now
                </button>
              </div>
            )}
          </div>
        )
      })}

      <p className="px-1 text-[0.72rem] leading-relaxed text-[color:var(--ink-faint)]">
        Connections are stored on this device in the current build. Production sync uses OAuth (Google Calendar API,
        Microsoft Graph) and CalDAV for Apple, which requires server-side credentials.
      </p>
    </div>
  )
}
