import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BarChart3, Compass, Crown, Layers, Mail, ScrollText, ShieldAlert, ShieldCheck, Siren, Trash2, UserMinus, Users } from 'lucide-react'
import { cn } from '../lib/cn'
import { ROLE_LABEL, useAdminData, useMyRole, type AdminMember, type UserRole } from '../lib/useAdmin'
import { useCompliance } from '../lib/useBusiness'
import { useStore } from '../store'
import { PLANS, type PlanId } from '../lib/plans'
import { useAuth } from '../auth/AuthContext'
import { currentUserId } from '../lib/invoicesDb'
import { AdminDiscoverPanel } from './AdminDiscoverPanel'

type Tab = 'people' | 'groups' | 'discover' | 'compliance' | 'analytics' | 'audit'

const field =
  'w-full rounded-[12px] border border-[color:var(--border-strong)] bg-[color:var(--subtle-2)] px-3.5 py-2.5 text-base text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] md:text-[0.85rem]'
const primaryBtn =
  'cursor-pointer rounded-full bg-[color:var(--accent)] px-4 py-2.5 text-[0.8rem] font-bold text-[color:var(--accent-ink)] transition hover:brightness-110'

const ROLE_STYLE: Record<UserRole, string> = {
  super_admin: 'bg-[rgba(251,191,36,0.18)] text-[#FCD770]',
  group_admin: 'bg-[rgba(124,111,255,0.22)] text-[#C6BFFF]',
  user: 'bg-[color:var(--subtle-2)] text-[color:var(--ink-dim)]',
}

const ACTION_LABEL: Record<string, string> = {
  'role.changed': 'changed a role',
  'member.role_changed': 'changed a member’s group role',
  'member.removed': 'removed a member',
  'member.invited': 'invited someone',
  'user.removed': 'removed an account',
  'group.deleted': 'deleted a group',
  'plan.granted': 'changed a plan',
}

function fmtWhen(iso: string) {
  return new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

export function AdminView() {
  const { role, isAdmin, isSuperAdmin, loading: roleLoading, dbMode } = useMyRole()
  const { people, groups, audit, loading, error, setUserRole, setUserPlan, removeUser, deleteGroup, membersOf, setMemberRole, removeMember, inviteToGroup } = useAdminData()
  const { user } = useAuth()
  const [myId, setMyId] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  useEffect(() => {
    void currentUserId().then(id => setMyId(id ?? user?.id ?? null))
  }, [user])
  const [tab, setTab] = useState<Tab>('people')
  const [notice, setNotice] = useState<string | null>(null)

  const flash = (m: string) => {
    setNotice(m)
    setTimeout(() => setNotice(null), 4000)
  }

  if (roleLoading) {
    return <div className="card px-6 py-12 text-center text-[0.85rem] text-[color:var(--ink-dim)]">Checking your access…</div>
  }

  if (!isAdmin) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--subtle-2)] text-[color:var(--ink-dim)]">
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
    { key: 'discover', label: 'Discover events', icon: Compass },
    { key: 'compliance', label: 'Compliance', icon: Siren },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'audit', label: 'Audit log', icon: ScrollText },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display flex items-center gap-2 text-[1.05rem] font-bold">
          <ShieldCheck size={17} className="text-[color:var(--accent)]" /> Admin console
        </h2>
        <p className="text-[0.78rem] text-[color:var(--ink-dim)]">
          You are {ROLE_LABEL[role ?? 'user']}
          {isSuperAdmin ? ' — you can manage every person and group.' : ' — you can manage the groups you administer.'}
        </p>
      </div>

      {!dbMode && (
        <div className="card px-[18px] py-3 text-[0.75rem] text-[#FCD770]">
          Demo mode — showing the console as a simulated Super Admin. Connect Supabase and run migration 0005 for real roles.
        </div>
      )}
      {error && <div className="card px-[18px] py-3 text-[0.75rem] text-[color:var(--red)]">{error}</div>}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card overflow-hidden px-[18px] py-3 text-[0.78rem] text-[color:var(--teal)]"
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
                active ? 'text-[color:var(--ink)]' : 'text-[color:var(--ink-faint)] hover:text-[color:var(--ink-dim)]',
              )}
            >
              {active && (
                <motion.span
                  layoutId="admin-tab"
                  className="absolute inset-0 rounded-full bg-[color:var(--surface-2)] "
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

      {loading && <div className="card px-6 py-8 text-center text-[0.82rem] text-[color:var(--ink-dim)]">Loading…</div>}

      {!loading && tab === 'people' && (
        <div className="flex flex-col gap-2">
          {people.length === 0 && (
            <div className="card px-6 py-10 text-center text-[0.82rem] text-[color:var(--ink-dim)]">
              No people to show yet — they'll appear here once accounts exist.
            </div>
          )}
          {people.map(p => (
            <div key={p.id} className="card flex flex-wrap items-center gap-3 px-[18px] py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-[0.65rem] font-bold">
                {p.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.88rem] font-bold">{p.name}</div>
                <div className="truncate text-[0.72rem] text-[color:var(--ink-faint)]">{p.email}</div>
              </div>
              <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[0.6rem] font-bold', ROLE_STYLE[p.role])}>
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
                  className="shrink-0 rounded-[10px] border border-[color:var(--border-strong)] bg-[color:var(--subtle-2)] px-2.5 py-1.5 text-[0.72rem] text-[color:var(--ink)] outline-none"
                >
                  <option value="user" className="bg-[color:var(--surface-2)]">User</option>
                  <option value="group_admin" className="bg-[color:var(--surface-2)]">Group Admin</option>
                  <option value="super_admin" className="bg-[color:var(--surface-2)]">Super Admin</option>
                </select>
              )}
              {isSuperAdmin && (
                <select
                  value={p.plan}
                  onChange={async e => {
                    const next = e.target.value as PlanId
                    const err = await setUserPlan(p.id, next, p.name)
                    flash(err ? `Couldn't change ${p.name}'s plan — ${err}` : `${p.name} is now on ${PLANS.find(x => x.id === next)?.name ?? next}`)
                  }}
                  aria-label={`Plan for ${p.name}`}
                  title={p.planStatus === 'granted' ? 'Set by an admin' : p.planStatus !== 'none' ? `Stripe: ${p.planStatus}` : 'Free'}
                  className="shrink-0 rounded-[10px] border border-[color:var(--border-strong)] bg-[color:var(--subtle-2)] px-2.5 py-1.5 text-[0.72rem] text-[color:var(--ink)] outline-none"
                >
                  {PLANS.map(pl => (
                    <option key={pl.id} value={pl.id} className="bg-[color:var(--surface-2)]">{pl.name}{p.plan === pl.id && p.planStatus === 'granted' ? ' (granted)' : ''}</option>
                  ))}
                </select>
              )}
              {isSuperAdmin && p.id !== myId && (
                <button
                  onClick={async () => {
                    if (confirmRemove !== p.id) {
                      setConfirmRemove(p.id)
                      return
                    }
                    setConfirmRemove(null)
                    const err = await removeUser(p.id, p.name)
                    flash(err ? `Couldn't remove ${p.name} — ${err}` : `${p.name}'s account was removed`)
                  }}
                  onBlur={() => setConfirmRemove(null)}
                  aria-label={`Remove ${p.name}`}
                  className={cn('btn-ghost shrink-0 px-2.5 py-1.5 text-[0.72rem]', confirmRemove === p.id ? 'btn-danger border-[rgba(248,113,113,0.5)]' : 'btn-danger')}
                >
                  <Trash2 size={13} /> {confirmRemove === p.id ? 'Confirm removal' : 'Remove'}
                </button>
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
          {groups.length === 0 && <div className="card px-6 py-10 text-center text-[0.82rem] text-[color:var(--ink-dim)]">No groups yet.</div>}
          {groups.map(g => (
            <GroupAdminRow
              key={g.id}
              group={g}
              canManage={isSuperAdmin || g.iAmAdmin}
              membersOf={membersOf}
              onSetRole={setMemberRole}
              onRemove={removeMember}
              onInvite={inviteToGroup}
              onDelete={deleteGroup}
              onNotice={flash}
            />
          ))}
        </div>
      )}

      {tab === 'discover' && <AdminDiscoverPanel canPublish={isSuperAdmin} onNotice={flash} />}
      {!loading && tab === 'compliance' && <CompliancePanel onNotice={flash} />}
      {!loading && tab === 'analytics' && <AnalyticsPanel />}

      {!loading && tab === 'audit' && (
        <div className="card p-5">
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
/** Slices 2 & 3: escalation policy per group, and the open escalation queue. */
function CompliancePanel({ onNotice }: { onNotice: (m: string) => void }) {
  const { policies, open, updatePolicy, resolveEscalation, escalateFurther } = useCompliance()

  const hoursAgo = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3600_000))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="font-display px-1 text-[0.92rem] font-bold">Open escalations</h3>
        {open.length === 0 ? (
          <div className="card px-6 py-8 text-center text-[0.82rem] text-[color:var(--ink-dim)]">
            Nothing escalated. Compliance reminders that go unacknowledged past their window will appear here.
          </div>
        ) : (
          open.map(e => (
            <div key={e.id} className="card flex flex-col gap-2 px-[18px] py-3.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[rgba(255,107,107,0.16)] text-base">🚨</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.88rem] font-bold">{e.reminderTitle}</div>
                  <div className="truncate text-[0.72rem] text-[color:var(--ink-faint)]">
                    {e.subjectName} · {e.groupName} · raised {hoursAgo(e.raisedAt)}h ago
                  </div>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-[0.6rem] font-bold',
                    e.stage === 'super_admin' ? 'bg-[rgba(255,107,107,0.2)] text-[#FFB4B4]' : 'bg-[rgba(251,191,36,0.18)] text-[#FCD770]',
                  )}
                >
                  {e.stage === 'super_admin' ? 'Super Admin' : 'Group Admin'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    resolveEscalation(e.id, 'Resolved by admin')
                    onNotice(`${e.reminderTitle} marked resolved`)
                  }}
                  className="cursor-pointer rounded-full bg-[linear-gradient(135deg,#2DD4BF,#1FA895)] px-3.5 py-1.5 text-[0.75rem] font-bold text-[#0c2b26]"
                >
                  Resolve
                </button>
                {e.stage === 'group_admin' && (
                  <button
                    onClick={() => {
                      escalateFurther(e.id)
                      onNotice(`${e.reminderTitle} escalated to Super Admin`)
                    }}
                    className="cursor-pointer rounded-full border border-[color:var(--border-strong)] bg-[color:var(--subtle-2)] px-3.5 py-1.5 text-[0.75rem] font-semibold text-[color:var(--ink-dim)] transition hover:text-[color:var(--ink)]"
                  >
                    Escalate further
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-display px-1 text-[0.92rem] font-bold">Group policy</h3>
        <p className="px-1 text-[0.74rem] text-[color:var(--ink-dim)]">
          Compliance reminders must be acknowledged. Unacknowledged ones escalate to the Group Admin, then to a Super Admin.
        </p>
        {policies.map(p => (
          <div key={p.groupId} className="card flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-[0.9rem] font-bold">{p.groupName}</span>
              <label className="flex shrink-0 items-center gap-2 text-[0.75rem] text-[color:var(--ink-dim)]">
                <input
                  type="checkbox"
                  checked={p.complianceEnabled}
                  onChange={e => updatePolicy(p.groupId, { complianceEnabled: e.target.checked })}
                  className="accent-[color:var(--cyan)]"
                />
                Compliance mode
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-[0.72rem] text-[color:var(--ink-dim)]">
                Escalate after (hours)
                <input
                  type="number" min={1} max={168} value={p.escalateAfterHours}
                  onChange={e => updatePolicy(p.groupId, { escalateAfterHours: Number(e.target.value) })}
                  disabled={!p.complianceEnabled}
                  className="mt-1 w-full rounded-[10px] border border-[color:var(--border-strong)] bg-[color:var(--subtle-2)] px-2.5 py-1.5 text-[color:var(--ink)] outline-none disabled:opacity-50"
                />
              </label>
              <label className="text-[0.72rem] text-[color:var(--ink-dim)]">
                Then Super Admin after
                <input
                  type="number" min={1} max={336} value={p.secondHopHours}
                  onChange={e => updatePolicy(p.groupId, { secondHopHours: Number(e.target.value) })}
                  disabled={!p.complianceEnabled}
                  className="mt-1 w-full rounded-[10px] border border-[color:var(--border-strong)] bg-[color:var(--subtle-2)] px-2.5 py-1.5 text-[color:var(--ink)] outline-none disabled:opacity-50"
                />
              </label>
              <label className="text-[0.72rem] text-[color:var(--ink-dim)]">
                Default lead time (min)
                <input
                  type="number" min={0} max={10080} value={p.defaultLeadMinutes}
                  onChange={e => updatePolicy(p.groupId, { defaultLeadMinutes: Number(e.target.value) })}
                  className="mt-1 w-full rounded-[10px] border border-[color:var(--border-strong)] bg-[color:var(--subtle-2)] px-2.5 py-1.5 text-[color:var(--ink)] outline-none"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 border-t border-[color:var(--border)] pt-3 text-[0.78rem]">
              <input
                type="checkbox"
                checked={p.membersMayCreate}
                onChange={e => updatePolicy(p.groupId, { membersMayCreate: e.target.checked })}
                className="accent-[color:var(--cyan)]"
              />
              Members may create their own group reminders
              {!p.membersMayCreate && <span className="text-[color:var(--ink-faint)]">— new ones need admin approval</span>}
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
/** Slice 4: acknowledgement analytics derived from live reminder state. */
function AnalyticsPanel() {
  const { state, derived } = useStore()
  const { open } = useCompliance()

  const total = state.reminders.length
  const acked = state.reminders.filter(r => r.acknowledged).length
  const overdue = state.reminders.filter(r => !r.acknowledged && r.dayOffset < 0).length
  const snoozed = state.reminders.filter(r => r.snoozedUntil).length
  const ackRate = total ? Math.round((acked / total) * 100) : 0

  const byCategory = (['compliance', 'group', 'personal'] as const).map(c => {
    const items = state.reminders.filter(r => r.category === c)
    const done = items.filter(r => r.acknowledged).length
    return { category: c, total: items.length, done, pct: items.length ? Math.round((done / items.length) * 100) : 0 }
  })

  const CAT_COLOR: Record<string, string> = { compliance: 'var(--red)', group: 'var(--teal)', personal: 'var(--violet)' }

  const stats = [
    { label: 'Acknowledgement rate', value: `${ackRate}%`, tone: ackRate >= 85 ? 'text-[#7BE9D8]' : 'text-[#FCD770]' },
    { label: 'Open escalations', value: String(open.length), tone: open.length ? 'text-[#FFB4B4]' : 'text-[#7BE9D8]' },
    { label: 'Overdue', value: String(overdue), tone: overdue ? 'text-[#FFB4B4]' : 'text-[#7BE9D8]' },
    { label: 'Snoozed', value: String(snoozed), tone: 'text-[color:var(--ink-dim)]' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(s => (
          <div key={s.label} className="card p-4">
            <div className={cn('font-display text-[1.6rem] font-extrabold leading-none', s.tone)}>{s.value}</div>
            <div className="mt-1 text-[0.68rem] text-[color:var(--ink-faint)]">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="font-display mb-3 text-[0.92rem] font-bold">Acknowledgement by category</h3>
        <div className="flex flex-col gap-3">
          {byCategory.map(c => (
            <div key={c.category}>
              <div className="mb-1 flex items-center justify-between text-[0.76rem]">
                <span className="capitalize">{c.category}</span>
                <span className="text-[color:var(--ink-faint)]">
                  {c.done}/{c.total} · {c.pct}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[color:var(--subtle-2)]">
                <div className="h-full rounded-full transition-all" style={{ width: `${c.pct}%`, background: CAT_COLOR[c.category] }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-display mb-1 text-[0.92rem] font-bold">Needs attention</h3>
        <p className="mb-3 text-[0.74rem] text-[color:var(--ink-dim)]">Unacknowledged reminders, most overdue first.</p>
        {derived.active.filter(r => r.dayOffset <= 0).length === 0 ? (
          <p className="py-4 text-center text-[0.8rem] text-[color:var(--ink-dim)]">Everything due has been acknowledged.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {[...derived.active]
              .filter(r => r.dayOffset <= 0)
              .sort((a, b) => a.dayOffset - b.dayOffset)
              .slice(0, 8)
              .map(r => (
                <li key={r.id} className="flex items-center gap-2.5 text-[0.8rem]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CAT_COLOR[r.category] }} />
                  <span className="min-w-0 flex-1 truncate">{r.title}</span>
                  <span className={cn('shrink-0 text-[0.7rem]', r.dayOffset < 0 ? 'text-[#FFB4B4]' : 'text-[color:var(--ink-faint)]')}>
                    {r.dayOffset < 0 ? `${Math.abs(r.dayOffset)}d overdue` : 'due today'}
                  </span>
                </li>
              ))}
          </ol>
        )}
      </div>
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
  onDelete,
  onNotice,
}: {
  group: { id: string; name: string; color: string; memberCount: number; iAmAdmin: boolean }
  canManage: boolean
  membersOf: (id: string) => Promise<AdminMember[]>
  onSetRole: (membershipId: string, groupId: string, role: 'admin' | 'member', name: string) => Promise<string | null>
  onRemove: (membershipId: string, groupId: string, name: string) => Promise<string | null>
  onInvite: (groupId: string, email: string, role: 'admin' | 'member') => Promise<string | null>
  onDelete: (groupId: string, name: string) => Promise<string | null>
  onNotice: (m: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [members, setMembers] = useState<AdminMember[]>([])
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')

  useEffect(() => {
    if (open) void membersOf(group.id).then(setMembers)
  }, [open, group.id, membersOf])

  const refresh = () => void membersOf(group.id).then(setMembers)

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 pr-3">
      <button onClick={() => setOpen(o => !o)} className="flex min-w-0 flex-1 items-center gap-3 px-[18px] py-3.5 text-left">
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
      {canManage && (
        <button
          onClick={async () => {
            if (!confirmDelete) {
              setConfirmDelete(true)
              return
            }
            setConfirmDelete(false)
            const err = await onDelete(group.id, group.name)
            onNotice(err ? `Couldn't delete ${group.name} — ${err}` : `${group.name} was deleted`)
          }}
          onBlur={() => setConfirmDelete(false)}
          aria-label={`Delete group ${group.name}`}
          className="btn-ghost btn-danger shrink-0 px-2.5 py-1.5 text-[0.72rem]"
        >
          <Trash2 size={13} /> {confirmDelete ? 'Confirm delete' : 'Delete'}
        </button>
      )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-[color:var(--border)]"
          >
            <div className="flex flex-col gap-2 px-[18px] py-4">
              {members.length === 0 && <p className="text-[0.78rem] text-[color:var(--ink-faint)]">No members loaded.</p>}
              {members.map(m => (
                <div key={m.membershipId} className="flex flex-wrap items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-[0.6rem] font-bold">
                    {m.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[0.82rem] font-semibold">{m.name}</span>
                      {m.status !== 'active' && (
                        <span className="badge bg-[color:var(--subtle-2)] text-[color:var(--ink-dim)]">{m.status === 'invited' ? 'Invited' : 'Requested'}</span>
                      )}
                    </div>
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
                        className="shrink-0 rounded-[9px] border border-[color:var(--border-strong)] bg-[color:var(--subtle-2)] px-2 py-1 text-[0.7rem] text-[color:var(--ink)] outline-none"
                      >
                        <option value="member" className="bg-[color:var(--surface-2)]">Member</option>
                        <option value="admin" className="bg-[color:var(--surface-2)]">Admin</option>
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
                  className="mt-2 flex flex-wrap gap-2 border-t border-[color:var(--border)] pt-3"
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
                    className="rounded-full border border-[color:var(--border-strong)] bg-[color:var(--subtle-2)] px-3 py-2 text-[0.75rem] text-[color:var(--ink)] outline-none"
                  >
                    <option value="member" className="bg-[color:var(--surface-2)]">as Member</option>
                    <option value="admin" className="bg-[color:var(--surface-2)]">as Admin</option>
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
