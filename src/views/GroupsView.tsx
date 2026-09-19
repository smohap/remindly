import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Check, FolderOpen, KeyRound, MessageSquare, Plus, Trash2, UserPlus, X } from 'lucide-react'
import { cn } from '../lib/cn'
import { GroupChat } from '../components/GroupChat'
import { GroupWorkspace } from '../components/GroupWorkspace'
import { ToggleSwitch } from '../components/ToggleSwitch'
import { UpgradeGate } from '../components/UpgradeGate'
import { usePlan } from '../lib/usePlan'
import { useAuth } from '../auth/AuthContext'
import { GROUP_COLORS, useGroups, type GroupHit, type PersonHit } from '../lib/useGroups'

export function GroupsView() {
  const { can } = usePlan()
  const { groups, invitations, awaiting, createGroup, addMember, removeMember, deleteGroup, requestToJoin, requestToJoinGroup, setMembersCanEdit, setMemberRole, searchPeople, searchGroups, respond, error, loading } = useGroups()
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)
  const [people, setPeople] = useState<PersonHit[]>([])
  const [groupQuery, setGroupQuery] = useState('')
  const [groupHits, setGroupHits] = useState<GroupHit[]>([])
  const { user } = useAuth()
  const [joining, setJoining] = useState(false)
  const [code, setCode] = useState('')
  const [joinMsg, setJoinMsg] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(GROUP_COLORS[0])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [memberInput, setMemberInput] = useState('')

  // People typeahead for the invite box.
  useEffect(() => {
    const q = memberInput.trim()
    if (q.length < 2) {
      setPeople([])
      return
    }
    const t = setTimeout(() => void searchPeople(q).then(setPeople), 250)
    return () => clearTimeout(t)
  }, [memberInput, searchPeople])

  // Group search for "Join a group".
  useEffect(() => {
    const q = groupQuery.trim()
    if (q.length < 2) {
      setGroupHits([])
      return
    }
    const t = setTimeout(() => void searchGroups(q).then(setGroupHits), 250)
    return () => clearTimeout(t)
  }, [groupQuery, searchGroups])

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="font-display text-[1.05rem] font-bold">Your groups</h2>
          <p className="text-[0.78rem] text-[color:var(--ink-dim)]">Create groups and invite members to coordinate reminders.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => setJoining(v => !v)} className="btn-ghost">
            <KeyRound size={14} /> Join Group
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
          className="card flex flex-col gap-3 p-4"
        >
          <div>
            <label className="mb-1.5 block text-[0.72rem] font-semibold text-[color:var(--ink-dim)]">Search groups by name</label>
            <input autoFocus value={groupQuery} onChange={e => setGroupQuery(e.target.value)} placeholder="e.g. Wellington Rugby" className="field" />
          </div>
          {groupHits.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {groupHits.map(h => (
                <div key={h.id} className="flex items-center gap-3 rounded-[10px] bg-[color:var(--subtle)] px-3 py-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: h.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.84rem] font-semibold">{h.name}</div>
                    <div className="truncate text-[0.7rem] text-[color:var(--ink-faint)]">
                      {h.memberCount} member{h.memberCount === 1 ? '' : 's'}
                      {h.description ? ` · ${h.description}` : ''}
                    </div>
                  </div>
                  {h.myStatus === 'active' ? (
                    <span className="badge bg-[color:var(--subtle-2)] text-[color:var(--ink-dim)]">Member</span>
                  ) : h.myStatus === 'requested' ? (
                    <span className="badge bg-[color:var(--subtle-2)] text-[color:var(--ink-dim)]">Requested</span>
                  ) : h.myStatus === 'invited' ? (
                    <span className="badge bg-[color:var(--accent-soft)] text-[color:var(--accent)]">Invited — see above</span>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        const err = await requestToJoinGroup(h.id)
                        setJoinMsg(err ?? `Request sent to ${h.name} — an admin will approve it.`)
                        if (!err) setGroupHits(prev => prev.map(x => (x.id === h.id ? { ...x, myStatus: 'requested' } : x)))
                      }}
                      className="btn-primary px-3 py-1.5 text-[0.74rem]"
                    >
                      Ask to join
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {groupQuery.trim().length >= 2 && groupHits.length === 0 && <p className="text-[0.74rem] text-[color:var(--ink-faint)]">No groups match that name.</p>}
          <div className="flex flex-col gap-2 border-t border-[color:var(--border)] pt-3 sm:flex-row sm:items-center">
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="…or enter a group code, e.g. 7F3A9C1D" className="field sm:flex-1" />
            <button type="submit" className="btn-ghost">Ask to join by code</button>
          </div>
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
                  {(() => {
                    const isAdmin = g.role === 'admin'
                    const active = g.members.filter(m => m.status === 'active')
                    const invited = g.members.filter(m => m.status === 'invited')
                    const requested = g.members.filter(m => m.status === 'requested')
                    const Row = ({ m, right }: { m: (typeof g.members)[number]; right: React.ReactNode }) => (
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-[0.65rem] font-bold text-[color:var(--accent-ink)]">{m.initials}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[0.82rem] font-semibold">{m.name}</div>
                          <div className="truncate text-[0.7rem] text-[color:var(--ink-faint)]">{m.email}</div>
                        </div>
                        {right}
                      </div>
                    )
                    const label = (t: string, n: number) => (
                      <div className="mt-1 text-[0.66rem] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">
                        {t} · {n}
                      </div>
                    )
                    return (
                      <>
                        {label('Members', active.length)}
                        {active.map(m => (
                          <Row
                            key={m.id}
                            m={m}
                            right={
                              <>
                                <span className="shrink-0 text-[0.62rem] font-bold uppercase tracking-[0.06em] text-[color:var(--ink-faint)]">{m.role}</span>
                                {isAdmin && m.email.toLowerCase() !== (user?.email ?? '').toLowerCase() && (
                                  <button
                                    onClick={() => void setMemberRole(g.id, m.id, m.role === 'admin' ? 'member' : 'admin')}
                                    className="btn-ghost shrink-0 px-2 py-1 text-[0.7rem]"
                                    title={m.role === 'admin' ? 'Step down to member' : 'Make a group admin'}
                                  >
                                    {m.role === 'admin' ? 'Remove admin' : 'Make admin'}
                                  </button>
                                )}
                                {isAdmin && m.role !== 'admin' && (
                                  <button onClick={() => removeMember(g.id, m.id)} aria-label={`Remove ${m.name} from the group`} title="Remove from group" className="btn-ghost btn-danger shrink-0 px-2 py-1 text-[0.7rem]">
                                    <X size={13} /> Remove
                                  </button>
                                )}
                              </>
                            }
                          />
                        ))}
                        {(isAdmin || invited.length > 0) && label('Invited', invited.length)}
                        {invited.length === 0 && isAdmin && <p className="text-[0.72rem] text-[color:var(--ink-faint)]">No open invitations.</p>}
                        {invited.map(m => (
                          <Row
                            key={m.id}
                            m={m}
                            right={
                              <>
                                <span className="badge shrink-0 bg-[color:var(--subtle-2)] text-[color:var(--ink-dim)]">Awaiting reply</span>
                                {isAdmin && (
                                  <button onClick={() => removeMember(g.id, m.id)} aria-label={`Cancel invitation for ${m.name}`} className="btn-ghost shrink-0 px-2 py-1 text-[0.7rem]">
                                    Cancel invite
                                  </button>
                                )}
                              </>
                            }
                          />
                        ))}
                        {isAdmin && label('Requests to join', requested.length)}
                        {isAdmin && requested.length === 0 && <p className="text-[0.72rem] text-[color:var(--ink-faint)]">No pending requests.</p>}
                        {isAdmin &&
                          requested.map(m => (
                            <Row
                              key={m.id}
                              m={m}
                              right={
                                <span className="flex shrink-0 gap-1.5">
                                  <button onClick={() => respond(g.id, m.id, true)} className="btn-primary px-2.5 py-1 text-[0.72rem]">Approve</button>
                                  <button onClick={() => respond(g.id, m.id, false)} className="btn-ghost px-2.5 py-1 text-[0.72rem]">Reject</button>
                                </span>
                              }
                            />
                          ))}
                      </>
                    )
                  })()}

                  {g.role === 'admin' && (
                  <form
                    onSubmit={async e => {
                      e.preventDefault()
                      const msg = await addMember(g.id, memberInput)
                      setInviteMsg(msg)
                      setMemberInput('')
                    }}
                    className="relative mt-2 flex gap-2"
                  >
                    {selectedId === g.id && people.length > 0 && (
                      <div className="card-solid absolute left-0 top-full z-20 mt-1 flex w-full max-w-md flex-col overflow-hidden p-1">
                        {people.map(ph => (
                          <button
                            key={ph.id}
                            type="button"
                            onClick={() => {
                              setMemberInput(ph.email)
                              setPeople([])
                            }}
                            className="flex items-center gap-2.5 rounded-[9px] px-3 py-2 text-left hover:bg-[color:var(--hover)]"
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-[0.6rem] font-bold text-[color:var(--accent-ink)]">{ph.name.slice(0, 2).toUpperCase()}</span>
                            <span className="min-w-0">
                              <span className="block truncate text-[0.82rem] font-semibold">{ph.name}</span>
                              <span className="block truncate text-[0.7rem] text-[color:var(--ink-faint)]">{ph.email}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    <input
                      value={selectedId === g.id ? memberInput : ''}
                      onChange={e => setMemberInput(e.target.value)}
                      placeholder="Search by name, or type an email to invite…"
                      className="min-w-0 flex-1 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--subtle-2)] px-4 py-2.5 text-base text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] md:text-[0.82rem]"
                    />
                    <button type="submit" className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[color:var(--subtle-2)] px-4 py-2.5 text-[0.78rem] font-bold text-[color:var(--ink)] transition hover:bg-[color:var(--hover)]">
                      <UserPlus size={15} /> Invite
                    </button>
                  </form>
                  )}
                  {inviteMsg && selectedId === g.id && <p className="text-[0.74rem] text-[color:var(--ink-dim)]">{inviteMsg}</p>}
                  {g.role === 'admin' && g.joinCode && (
                    <p className="text-[0.72rem] text-[color:var(--ink-faint)]">
                      Group code <span className="font-mono font-bold text-[color:var(--ink)]">{g.joinCode}</span> — share it so people can ask to join; you approve each request here.
                    </p>
                  )}

                  <div className="mt-3 border-t border-[color:var(--border)] pt-3">
                    <div className="mb-2.5 flex flex-wrap items-center gap-2">
                      <FolderOpen size={14} className="text-[color:var(--ink-dim)]" />
                      <span className="text-[0.8rem] font-bold">Workspace</span>
                      <span className="text-[0.7rem] text-[color:var(--ink-faint)]">shared lists, notes and documents</span>
                      {g.role === 'admin' && (
                        <label className="ml-auto flex items-center gap-2 text-[0.72rem] text-[color:var(--ink-dim)]">
                          Members can edit
                          <ToggleSwitch on={g.membersCanEdit} onChange={() => void setMembersCanEdit(g.id, !g.membersCanEdit)} label="Members can edit the workspace" />
                        </label>
                      )}
                    </div>
                    {g.role === 'admin' || can('group_workspace') ? (
                      <GroupWorkspace groupId={g.id} canEdit={g.role === 'admin' || g.membersCanEdit} />
                    ) : (
                      <UpgradeGate feature="group_workspace" description="Shared lists, notes and documents for this group. Included in Personal Plus and all business plans." />
                    )}
                  </div>

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
