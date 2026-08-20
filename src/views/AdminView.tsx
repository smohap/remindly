import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Crown, Layers, Mail, ScrollText, ShieldAlert, ShieldCheck, UserMinus, Users } from 'lucide-react'
import { cn } from '../lib/cn'
import { ROLE_LABEL, useAdminData, useMyRole, type AdminMember, type UserRole } from '../lib/useAdmin'

type Tab = 'people' | 'groups' | 'audit'

const field =
  'w-full rounded-[12px] border border-[color:var(--glass-border)] bg-white/[0.08] px-3.5 py-2.5 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)] md:text-[0.85rem]'
const primaryBtn =
  'cursor-pointer rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-4 py-2.5 text-[0.8rem] font-bold text-[#1a1240] transition hover:brightness-110'

const ROLE_STYLE: Record<UserRole, string> = {
  super_admin: 'bg-[rgba(251,191,36,0.18)] text-[#FCD770]',
  group_admin: 'bg-[rgba(124,111,255,0.22)] text-[#C6BFFF]',
  user: 'bg-white/[0.12] text-[color:var(--ink-dim)]',
}

const ACTION_LABEL: Record<string, string> = {
  'role.changed': 'changed a role',
  'member.role_changed': 'changed a member’s group role',
  'member.removed': 'removed a member',
  'member.invited': 'invited someone',
}

function fmtWhen(iso: string) {
  return new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

export function AdminView() {
  const { role, isAdmin, isSuperAdmin, loading: roleLoading, dbMode } = useMyRole()
  const { people, groups, audit, loading, error, setUserRole, membersOf, setMemberRole, removeMember, inviteToGroup } = useAdminData()
  const [tab, setTab] = useState<Tab>('people')
  const [notice, setNotice] = useState<string | null>(null)

  const flash = (m: string) => {
    setNotice(m)
    setTimeout(() => setNotice(null), 4000)
  }

  if (roleLoading) {
    return <div className="glass px-6 py-12 text-center text-[0.85rem] text-[color:var(--ink-dim)]">Checking your access…</div>
  }

  if (!isAdmin) {
    return (
      <div className="glass flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.12] text-[color:var(--ink-dim)]">
          <ShieldAlert size={20} />
        </span>
        <h3 className="font-display text-[1.1rem] font-bold">Admin access required</h3>
        <p className="max-w-sm text-[0.85rem] text-[color:var(--ink-dim)]">
          You're signed in as {ROLE_LABEL[role ?? 'user']}. Ask a Super Admin to grant you an admin role.
        </p>
      </div>
    )
  }

  const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: 'people', label: 'People', icon: Users },
    { key: 'groups', label: 'Groups', icon: Layers },
    { key: 'audit', label: 'Audit log', icon: ScrollText },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display flex items-center gap-2 text-[1.05rem] font-bold">
          <ShieldCheck size={17} className="text-[color:var(--cyan)]" /> Admin console
        </h2>
        <p className="text-[0.78rem] text-[color:var(--ink-dim)]">
          You are {ROLE_LABEL[role ?? 'user']}
          {isSuperAdmin ? ' — you can manage every person and group.' : ' — you can manage the groups you administer.'}
        </p>
      </div>

      {!dbMode && (
        <div className="glass px-[18px] py-3 text-[0.75rem] text-[#FCD770]">
          Demo mode — showing the console as a simulated Super Admin. Connect Supabase and run migration 0005 for real roles.
        </div>
      )}
      {error && <div className="glass px-[18px] py-3 text-[0.75rem] text-[color:var(--red)]">{error}</div>}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass overflow-hidden px-[18px] py-3 text-[0.78rem] text-[color:var(--teal)]"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="scrollbar-hidden -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'relative flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.78rem] font-semibold transition-colors',
                active ? 'text-white' : 'text-[color:var(--ink-faint)] hover:text-[color:var(--ink-dim)]',
              )}
            >
              {active && (
                <motion.span
                  layoutId="admin-tab"
                  className="absolute inset-0 rounded-full bg-[color:var(--glass-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                <t.icon size={14} /> {t.label}
              </span>
            </button>
          )
        })}
      </div>

      {loading && <div className="glass px-6 py-8 text-center text-[0.82rem] text-[color:var(--ink-dim)]">Loading…</div>}

      {!loading && tab === 'people' && (
        <div className="flex flex-col gap-2">
          {people.length === 0 && (
            <div className="glass px-6 py-10 text-center text-[0.82rem] text-[color:var(--ink-dim)]">
              No people to show yet — they'll appear here once accounts exist.
            </div>
          )}
          {people.map(p => (
            <div key={p.id} className="glass flex flex-wrap items-center gap-3 px-[18px] py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--magenta),var(--violet))] text-[0.65rem] font-bold">
                {p.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.88rem] font-bold">{p.name}</div>
                <div className="truncate text-[0.72rem] text-[color:var(--ink-faint)]">{p.email}</div>
              </div>
              <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[0.6rem] font-extrabold uppercase tracking-[0.05em]', ROLE_STYLE[p.role])}>
                {p.role === 'super_admin' && <Crown size={9} className="mr-1 inline" />}
                {ROLE_LABEL[p.role]}
              </span>
              {isSuperAdmin && (
                <select
                  value={p.role}
                  onChange={async e => {
                    const next = e.target.value as UserRole
                    const err = await setUserRole(p.id, next, p.name)
                    flash(err ? `Couldn't change ${p.name}'s role — ${err}` : `${p.name} is now ${ROLE_LABEL[next]}`)
                  }}
                  aria-label={`Role for ${p.name}`}
                  className="shrink-0 rounded-[10px] border border-[color:var(--glass-border)] bg-white/[0.08] px-2.5 py-1.5 text-[0.72rem] text-white outline-none"
                >
                  <option value="user" className="bg-[color:var(--indigo)]">User</option>
                  <option value="group_admin" className="bg-[color:var(--indigo)]">Group Admin</option>
                  <option value="super_admin" className="bg-[color:var(--indigo)]">Super Admin</option>
                </select>
              )}
            </div>
          ))}
          {isSuperAdmin && (
            <p className="px-1 text-[0.7rem] text-[color:var(--ink-faint)]">
              You can't change your own role — that guard lives in the database, so the last Super Admin can't lock everyone out.
            </p>
          )}
        </div>
      )}

      {!loading && tab === 'groups' && (
        <div className="flex flex-col gap-2">
          {groups.length === 0 && <div className="glass px-6 py-10 text-center text-[0.82rem] text-[color:var(--ink-dim)]">No groups yet.</div>}
          {groups.map(g => (
            <GroupAdminRow
              key={g.id}
              group={g}
              canManage={isSuperAdmin || g.iAmAdmin}
              membersOf={membersOf}
              onSetRole={setMemberRole}
              onRemove={removeMember}
              onInvite={inviteToGroup}
              onNotice={flash}
            />
          ))}
        </div>
      )}

      {!loading && tab === 'audit' && (
        <div className="glass p-5">
          <h3 className="font-display mb-3 text-[0.92rem] font-bold">Recent activity</h3>
          {audit.length === 0 ? (
            <p className="py-6 text-center text-[0.8rem] text-[color:var(--ink-dim)]">
              Nothing logged yet. Administrative actions — role changes, invites, removals — appear here and cannot be edited or deleted.
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {audit.map(a => (
                <li key={a.id} className="flex gap-3 border-b border-white/[0.07] pb-3 last:border-0 last:pb-0">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[color:var(--violet)]" />
                  <div className="min-w-0">
                    <div className="text-[0.82rem]">
                      <span className="font-bold">{a.actorName}</span>{' '}
                      <span className="text-[color:var(--ink-dim)]">{ACTION_LABEL[a.action] ?? a.action}</span>
                      {typeof a.detail.name === 'string' && <span className="text-[color:var(--ink-dim)]"> — {a.detail.name}</span>}
                      {typeof a.detail.email === 'string' && <span className="text-[color:var(--ink-dim)]"> — {a.detail.email}</span>}
                      {typeof a.detail.role === 'string' && (
                        <span className="text-[color:var(--ink-dim)]"> to {ROLE_LABEL[a.detail.role as UserRole] ?? a.detail.role}</span>
                      )}
                    </div>
                    <div className="text-[0.68rem] text-[color:var(--ink-faint)]">{fmtWhen(a.at)}</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function GroupAdminRow({
  group,
  canManage,
  membersOf,
  onSetRole,
  onRemove,
  onInvite,
  onNotice,
}: {
  group: { id: string; name: string; color: string; memberCount: number; iAmAdmin: boolean }
  canManage: boolean
  membersOf: (id: string) => Promise<AdminMember[]>
  onSetRole: (membershipId: string, groupId: string, role: 'admin' | 'member', name: string) => Promise<string | null>
  onRemove: (membershipId: string, groupId: string, name: string) => Promise<string | null>
  onInvite: (groupId: string, email: string, role: 'admin' | 'member') => Promise<string | null>
  onNotice: (m: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<AdminMember[]>([])
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')

  useEffect(() => {
    if (open) void membersOf(group.id).then(setMembers)
  }, [open, group.id, membersOf])

  const refresh = () => void membersOf(group.id).then(setMembers)

  return (
    <div className="glass overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-3 px-[18px] py-3.5 text-left">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: group.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[0.9rem] font-bold">{group.name}</span>
            {group.iAmAdmin && (
              <span className="rounded-full bg-[rgba(124,111,255,0.22)] px-2 py-[1px] text-[0.58rem] font-extrabold uppercase text-[#C6BFFF]">Admin</span>
            )}
          </div>
          <div className="text-[0.72rem] text-[color:var(--ink-faint)]">
            {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-white/10"
          >
            <div className="flex flex-col gap-2 px-[18px] py-4">
              {members.length === 0 && <p className="text-[0.78rem] text-[color:var(--ink-faint)]">No members loaded.</p>}
              {members.map(m => (
                <div key={m.membershipId} className="flex flex-wrap items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--magenta),var(--violet))] text-[0.6rem] font-bold">
                    {m.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.82rem] font-semibold">{m.name}</div>
                    <div className="truncate text-[0.68rem] text-[color:var(--ink-faint)]">{m.email}</div>
                  </div>
                  {canManage ? (
                    <>
                      <select
                        value={m.memberRole}
                        onChange={async e => {
                          const next = e.target.value as 'admin' | 'member'
                          const err = await onSetRole(m.membershipId, group.id, next, m.name)
                          onNotice(err ? `Couldn't update ${m.name} — ${err}` : `${m.name} is now a group ${next}`)
                          refresh()
                        }}
                        aria-label={`Group role for ${m.name}`}
                        className="shrink-0 rounded-[9px] border border-[color:var(--glass-border)] bg-white/[0.08] px-2 py-1 text-[0.7rem] text-white outline-none"
                      >
                        <option value="member" className="bg-[color:var(--indigo)]">Member</option>
                        <option value="admin" className="bg-[color:var(--indigo)]">Admin</option>
                      </select>
                      <button
                        onClick={async () => {
                          const err = await onRemove(m.membershipId, group.id, m.name)
                          onNotice(err ? `Couldn't remove ${m.name} — ${err}` : `${m.name} removed from ${group.name}`)
                          refresh()
                        }}
                        aria-label={`Remove ${m.name}`}
                        className="shrink-0 cursor-pointer text-[color:var(--ink-faint)] transition hover:text-[color:var(--red)]"
                      >
                        <UserMinus size={15} />
                      </button>
                    </>
                  ) : (
                    <span className="shrink-0 text-[0.66rem] uppercase tracking-[0.05em] text-[color:var(--ink-faint)]">{m.memberRole}</span>
                  )}
                </div>
              ))}

              {canManage && (
                <form
                  onSubmit={async e => {
                    e.preventDefault()
                    const err = await onInvite(group.id, email, inviteRole)
                    onNotice(err ? `Invite failed — ${err}` : `Invitation created for ${email}`)
                    if (!err) setEmail('')
                  }}
                  className="mt-2 flex flex-wrap gap-2 border-t border-white/10 pt-3"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Invite by email…"
                    aria-label={`Invite someone to ${group.name}`}
                    className={cn(field, 'min-w-[180px] flex-1 rounded-full py-2')}
                  />
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as 'admin' | 'member')}
                    aria-label="Invite as"
                    className="rounded-full border border-[color:var(--glass-border)] bg-white/[0.08] px-3 py-2 text-[0.75rem] text-white outline-none"
                  >
                    <option value="member" className="bg-[color:var(--indigo)]">as Member</option>
                    <option value="admin" className="bg-[color:var(--indigo)]">as Admin</option>
                  </select>
                  <button type="submit" className={cn(primaryBtn, 'flex items-center gap-1.5')}>
                    <Mail size={14} /> Invite
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
