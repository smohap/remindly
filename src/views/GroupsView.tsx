import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Check, KeyRound, MessageSquare, Plus, Trash2, UserPlus, X } from 'lucide-react'
import { cn } from '../lib/cn'
import { GroupChat } from '../components/GroupChat'
import { UpgradeGate } from '../components/UpgradeGate'
import { usePlan } from '../lib/usePlan'
import { useAuth } from '../auth/AuthContext'
import { GROUP_COLORS, useGroups } from '../lib/useGroups'

export function GroupsView() {
  const { can } = usePlan()
  const { groups, invitations, awaiting, createGroup, addMember, removeMember, deleteGroup, requestToJoin, respond, error, loading } = useGroups()
  const { user } = useAuth()
  const [joining, setJoining] = useState(false)
  const [code, setCode] = useState('')
  const [joinMsg, setJoinMsg] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(GROUP_COLORS[0])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [memberInput, setMemberInput] = useState('')

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="font-display text-[1.05rem] font-bold">Your groups</h2>
          <p className="text-[0.78rem] text-[color:var(--ink-dim)]">Create groups and invite members to coordinate reminders.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => setJoining(v => !v)} className="btn-ghost">
            <KeyRound size={14} /> Join with code
          </button>
          <button
            onClick={() => setCreating(v => !v)}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[color:var(--accent)] px-3.5 py-2 text-[0.78rem] font-bold text-[color:var(--accent-ink)] transition hover:brightness-110"
          >
            <Plus size={15} /> New group
          </button>
        </div>
      </div>

      {joining && (
        <form
          onSubmit={async e => {
            e.preventDefault()
            const err = await requestToJoin(code)
            setJoinMsg(err ?? 'Request sent — a group admin will approve it.')
            if (!err) {
              setCode('')
              setJoining(false)
            }
          }}
          className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center"
        >
          <input autoFocus value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Group code, e.g. 7F3A9C1D" className="field sm:flex-1" />
          <button type="submit" className="btn-primary">Ask to join</button>
        </form>
      )}
      {joinMsg && <p className="px-1 text-[0.78rem] text-[color:var(--ink-dim)]">{joinMsg}</p>}

      {invitations.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="px-1 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">Invitations for you</div>
          {invitations.map(g => {
            const mine = g.members.find(m => m.status === 'invited' && m.email && m.email.toLowerCase() === (user?.email ?? '').toLowerCase()) ?? g.members.find(m => m.status === 'invited')
            return (
              <div key={g.id} className="card flex flex-wrap items-center gap-3 px-[18px] py-3.5">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: g.color }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.88rem] font-bold">{g.name}</div>
                  <div className="text-[0.72rem] text-[color:var(--ink-faint)]">You've been invited to join this group.</div>
                </div>
                {mine && (
                  <>
                    <button onClick={() => respond(g.id, mine.id, true)} className="btn-primary px-3 py-1.5 text-[0.76rem]">
                      <Check size={14} /> Accept
                    </button>
                    <button onClick={() => respond(g.id, mine.id, false)} className="btn-ghost px-3 py-1.5 text-[0.76rem]">Decline</button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {awaiting.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="px-1 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">Waiting for approval</div>
          {awaiting.map(g => (
            <div key={g.id} className="card flex items-center gap-3 px-[18px] py-3.5 opacity-80">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: g.color }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.88rem] font-bold">{g.name}</div>
                <div className="text-[0.72rem] text-[color:var(--ink-faint)]">Your request is with the group admins.</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="px-1 text-[0.78rem] text-[color:var(--danger)]">{error}</p>}
      {loading && <p className="px-1 text-[0.78rem] text-[color:var(--ink-faint)]">Loading your groups…</p>}

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={e => {
                e.preventDefault()
                createGroup(name, color)
                setName('')
                setColor(GROUP_COLORS[0])
                setCreating(false)
              }}
              className="card flex flex-col gap-3 p-5"
            >
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Group name (e.g. North Shore Crew)"
                required
                className="w-full rounded-[14px] border border-[color:var(--border-strong)] bg-[color:var(--subtle-2)] px-4 py-3 text-base text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
              />
              <div className="flex items-center gap-2">
                <span className="text-[0.75rem] text-[color:var(--ink-dim)]">Colour</span>
                {GROUP_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Colour ${c}`}
                    className={cn('h-6 w-6 cursor-pointer rounded-full transition', color === c && 'ring-2 ring-white ring-offset-2 ring-offset-transparent')}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 cursor-pointer rounded-full bg-[color:var(--accent)] py-2.5 text-[0.82rem] font-bold text-[color:var(--accent-ink)]">
                  Create group
                </button>
                <button type="button" onClick={() => setCreating(false)} className="cursor-pointer rounded-full border border-[color:var(--border-strong)] bg-[color:var(--subtle-2)] px-4 py-2.5 text-[0.82rem] font-semibold text-[color:var(--ink-dim)]">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {groups.map(g => (
        <div key={g.id} className="card overflow-hidden">
          <button
            onClick={() => setSelectedId(selectedId === g.id ? null : g.id)}
            className="flex w-full cursor-pointer items-center gap-3 px-[18px] py-4 text-left"
          >
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: g.color }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[0.9rem] font-bold">{g.name}</span>
                {g.role === 'admin' && (
                  <span className="rounded-full bg-[color:var(--subtle-2)] px-2 py-[1px] text-[0.58rem] font-bold text-[color:var(--ink-dim)]">Admin</span>
                )}
              </div>
              <div className="text-[0.75rem] text-[color:var(--ink-faint)]">
                {g.members.filter(m => m.status === 'active').length} member{g.members.filter(m => m.status === 'active').length === 1 ? '' : 's'}
                {g.description ? ` · ${g.description}` : ''}
              </div>
            </div>
            <div className="flex -space-x-2">
              {g.members.filter(m => m.status === 'active').slice(0, 4).map(m => (
                <span
                  key={m.id}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--surface)] bg-[color:var(--accent)] text-[0.6rem] font-bold"
                  title={m.name}
                >
                  {m.initials}
                </span>
              ))}
            </div>
          </button>

          <AnimatePresence>
            {selectedId === g.id && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-[color:var(--border)]">
                <div className="flex flex-col gap-2 px-[18px] py-4">
                  {g.members.map(m => (
                    <div key={m.id} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-[0.65rem] font-bold">{m.initials}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[0.82rem] font-semibold">{m.name}</div>
                        <div className="truncate text-[0.7rem] text-[color:var(--ink-faint)]">{m.email}</div>
                      </div>
                      {m.status === 'active' ? (
                        <span className="shrink-0 text-[0.62rem] font-bold uppercase tracking-[0.06em] text-[color:var(--ink-faint)]">{m.role}</span>
                      ) : m.status === 'invited' ? (
                        <span className="badge shrink-0 bg-[color:var(--subtle-2)] text-[color:var(--ink-dim)]">Invited · awaiting reply</span>
                      ) : g.role === 'admin' ? (
                        <span className="flex shrink-0 gap-1.5">
                          <button onClick={() => respond(g.id, m.id, true)} className="btn-primary px-2.5 py-1 text-[0.72rem]">Approve</button>
                          <button onClick={() => respond(g.id, m.id, false)} className="btn-ghost px-2.5 py-1 text-[0.72rem]">Reject</button>
                        </span>
                      ) : (
                        <span className="badge shrink-0 bg-[color:var(--subtle-2)] text-[color:var(--ink-dim)]">Requested</span>
                      )}
                      {g.role === 'admin' && m.status === 'active' && g.members.length > 1 && (
                        <button onClick={() => removeMember(g.id, m.id)} aria-label={`Remove ${m.name}`} className="shrink-0 cursor-pointer text-[color:var(--ink-faint)] transition hover:text-[color:var(--red)]">
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  ))}

                  <form
                    onSubmit={e => {
                      e.preventDefault()
                      addMember(g.id, memberInput)
                      setMemberInput('')
                    }}
                    className="mt-2 flex gap-2"
                  >
                    <input
                      value={selectedId === g.id ? memberInput : ''}
                      onChange={e => setMemberInput(e.target.value)}
                      placeholder="Invite by email — they'll need to accept…"
                      className="min-w-0 flex-1 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--subtle-2)] px-4 py-2.5 text-base text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] md:text-[0.82rem]"
                    />
                    <button type="submit" className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[color:var(--subtle-2)] px-4 py-2.5 text-[0.78rem] font-bold text-[color:var(--ink)] transition hover:bg-[color:var(--hover)]">
                      <UserPlus size={15} /> Invite
                    </button>
                  </form>
                  {g.role === 'admin' && g.joinCode && (
                    <p className="text-[0.72rem] text-[color:var(--ink-faint)]">
                      Group code <span className="font-mono font-bold text-[color:var(--ink)]">{g.joinCode}</span> — share it so people can ask to join; you approve each request here.
                    </p>
                  )}

                  <div className="mt-3 border-t border-[color:var(--border)] pt-3">
                    <div className="mb-2.5 flex items-center gap-2">
                      <MessageSquare size={14} className="text-[color:var(--ink-dim)]" />
                      <span className="text-[0.8rem] font-bold">Group chat</span>
                    </div>
                    {can('group_chat') ? (
                      <GroupChat groupId={g.id} groupColor={g.color} />
                    ) : (
                      <UpgradeGate feature="group_chat" description="Chat with the members of this group right where the reminders are. Included in Team and above." />
                    )}
                  </div>

                  {g.role === 'admin' && g.name !== 'Personal' && (
                    <button
                      onClick={() => {
                        deleteGroup(g.id)
                        setSelectedId(null)
                      }}
                      className="mt-1 flex cursor-pointer items-center gap-1.5 self-start text-[0.72rem] font-semibold text-[color:var(--ink-faint)] transition hover:text-[color:var(--red)]"
                    >
                      <Trash2 size={13} /> Delete group
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </>
  )
}
