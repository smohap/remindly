import { useEffect, useRef, useState } from 'react'
import { SendHorizonal } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { cn } from '../lib/cn'
import { formatTime, useGroupChat } from '../lib/useGroupChat'

export function GroupChat({ groupId, groupColor }: { groupId: string; groupColor: string }) {
  const { messages, send } = useGroupChat(groupId)
  const { user } = useAuth()
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const name = user?.name ?? 'You'
  const initials = user?.initials ?? 'ME'

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages.length])

  return (
    <div className="flex flex-col gap-3">
      <div className="scrollbar-hidden flex max-h-[320px] flex-col gap-3 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-8 text-center">
            <span className="text-2xl" aria-hidden>💬</span>
            <p className="text-[0.82rem] font-semibold">No messages yet</p>
            <p className="max-w-xs text-[0.75rem] text-[color:var(--ink-faint)]">Start the conversation — everyone in this group will see it.</p>
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={cn('flex items-end gap-2.5', m.self && 'flex-row-reverse')}>
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold"
                style={{ background: m.self ? 'linear-gradient(135deg,var(--magenta),var(--violet))' : `${groupColor}33` }}
                aria-hidden
              >
                {m.self ? initials : m.authorInitials}
              </span>
              <div className={cn('max-w-[78%]', m.self && 'text-right')}>
                <div className="mb-1 flex items-center gap-2 text-[0.65rem] text-[color:var(--ink-faint)]">
                  <span className={cn('font-semibold', m.self && 'order-2')}>{m.self ? 'You' : m.authorName}</span>
                  <span className={cn(m.self && 'order-1')}>{formatTime(m.at)}</span>
                </div>
                <div
                  className={cn(
                    'inline-block rounded-2xl px-3.5 py-2 text-left text-[0.85rem] leading-relaxed',
                    m.self ? 'bg-[linear-gradient(135deg,var(--cyan),var(--violet))] text-[#1a1240]' : 'border border-[color:var(--glass-border)] bg-white/[0.08] text-white',
                  )}
                >
                  {m.body}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={e => {
          e.preventDefault()
          send(text, name, initials)
          setText('')
        }}
        className="flex gap-2"
      >
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Message the group…"
          aria-label="Message the group"
          className="min-w-0 flex-1 rounded-full border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-2.5 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)] md:text-[0.85rem]"
        />
        <button
          type="submit"
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] text-[#1a1240] transition hover:brightness-110"
        >
          <SendHorizonal size={16} />
        </button>
      </form>
    </div>
  )
}
