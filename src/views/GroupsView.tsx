import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MessageSquare, Plus, Trash2, UserPlus, X } from 'lucide-react'
import { cn } from '../lib/cn'
import { GroupChat } from '../components/GroupChat'
import { GROUP_COLORS, useGroups } from '../lib/useGroups'

export function GroupsView() {
  const { groups, createGroup, addMember, removeMember, deleteGroup } = useGroups()
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
        <button
          onClick={() => setCreating(v => !v)}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-3.5 py-2 text-[0.78rem] font-bold text-[#1a1240] transition hover:brightness-110"
        >
          <Plus size={15} /> New group
        </button>
      </div>

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
              className="glass flex flex-col gap-3 p-5"
            >
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Group name (e.g. North Shore Crew)"
                required
                className="w-full rounded-[14px] border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-3 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)]"
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
                <button type="submit" className="flex-1 cursor-pointer rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] py-2.5 text-[0.82rem] font-bold text-[#1a1240]">
                  Create group
                </button>
                <button type="button" onClick={() => setCreating(false)} className="cursor-pointer rounded-full border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-2.5 text-[0.82rem] font-semibold text-[color:var(--ink-dim)]">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {groups.map(g => (
        <div key={g.id} className="glass overflow-hidden">
          <button
            onClick={() => setSelectedId(selectedId === g.id ? null : g.id)}
            className="flex w-full cursor-pointer items-center gap-3 px-[18px] py-4 text-left"
          >
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: g.color }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[0.9rem] font-bold">{g.name}</span>
                {g.role === 'admin' && (
                  <span className="rounded-full bg-white/[0.14] px-2 py-[1px] text-[0.58rem] font-extrabold uppercase tracking-[0.06em] text-[color:var(--ink-dim)]">Admin</span>
                )}
              </div>
              <div className="text-[0.75rem] text-[color:var(--ink-faint)]">
                {g.members.length} member{g.members.length === 1 ? '' : 's'}
                {g.description ? ` · ${g.description}` : ''}
              </div>
            </div>
            <div className="flex -space-x-2">
              {g.members.slice(0, 4).map(m => (
                <span
                  key={m.id}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--indigo)] bg-[linear-gradient(135deg,var(--magenta),var(--violet))] text-[0.6rem] font-bold"
                  title={m.name}
                >
                  {m.initials}
                </span>
              ))}
            </div>
          </button>

          <AnimatePresence>
            {selectedId === g.id && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-white/10">
                <div className="flex flex-col gap-2 px-[18px] py-4">
                  {g.members.map(m => (
                    <div key={m.id} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--magenta),var(--violet))] text-[0.65rem] font-bold">{m.initials}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[0.82rem] font-semibold">{m.name}</div>
                        <div className="truncate text-[0.7rem] text-[color:var(--ink-faint)]">{m.email}</div>
                      </div>
                      <span className="shrink-0 text-[0.62rem] font-bold uppercase tracking-[0.06em] text-[color:var(--ink-faint)]">{m.role}</span>
                      {g.role === 'admin' && g.members.length > 1 && (
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
                      placeholder="Add member by email…"
                      className="min-w-0 flex-1 rounded-full border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-2.5 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)] md:text-[0.82rem]"
                    />
                    <button type="submit" className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-white/[0.12] px-4 py-2.5 text-[0.78rem] font-bold text-white transition hover:bg-white/[0.2]">
                      <UserPlus size={15} /> Add
                    </button>
                  </form>

                  <div className="mt-3 border-t border-white/10 pt-3">
                    <div className="mb-2.5 flex items-center gap-2">
                      <MessageSquare size={14} className="text-[color:var(--ink-dim)]" />
                      <span className="text-[0.8rem] font-bold">Group chat</span>
                      <span className="rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-2 py-[1px] text-[0.55rem] font-extrabold uppercase tracking-[0.06em] text-[#1a1240]">
                        Premium
                      </span>
                    </div>
                    <GroupChat groupId={g.id} groupColor={g.color} />
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
