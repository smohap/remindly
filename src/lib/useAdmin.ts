import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { currentUserId } from './invoicesDb'
import { isPlanId, type PlanId } from './plans'

/**
 * The three-tier role system, read from the server.
 *
 * The UI uses this only to decide what to *show*. What a user may actually
 * *do* is enforced by RLS policies and triggers in 0005_admin_roles.sql —
 * hiding a button is not access control.
 */

export type UserRole = 'super_admin' | 'group_admin' | 'user'

export interface AdminProfile {
  id: string
  name: string
  email: string
  role: UserRole
  plan: PlanId
  /** 'granted' when set by an admin, a Stripe status otherwise, 'none' on free. */
  planStatus: string
}

export interface AdminGroup {
  id: string
  name: string
  color: string
  memberCount: number
  iAmAdmin: boolean
}

export interface AdminMember {
  membershipId: string
  userId: string
  name: string
  email: string
  memberRole: 'admin' | 'member'
  status: 'active' | 'invited' | 'requested'
}

export interface AuditEntry {
  id: string
  actorName: string
  action: string
  entity: string
  detail: Record<string, unknown>
  at: string
}

export const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  group_admin: 'Group Admin',
  user: 'User',
}

/** Demo fallback so the console is explorable without a backend. */
const DEMO_ROLE: UserRole = 'super_admin'

export function useMyRole() {
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [dbMode, setDbMode] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!supabase) {
        if (!cancelled) {
          setRole(DEMO_ROLE)
          setLoading(false)
        }
        return
      }
      const uid = await currentUserId()
      if (!uid) {
        if (!cancelled) {
          setRole(DEMO_ROLE)
          setLoading(false)
        }
        return
      }
      const { data } = await supabase.from('profiles').select('role').eq('id', uid).maybeSingle()
      if (cancelled) return
      setDbMode(true)
      setRole((data?.role as UserRole) ?? 'user')
      setLoading(false)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const isSuperAdmin = role === 'super_admin'
  const isAdmin = role === 'super_admin' || role === 'group_admin'
  return { role, isAdmin, isSuperAdmin, loading, dbMode }
}

/** Write an audit entry. Failures are swallowed — never block the action. */
export async function recordAudit(
  action: string,
  entity: string,
  entityId: string | null,
  detail: Record<string, unknown> = {},
) {
  if (!supabase) return
  try {
    const uid = await currentUserId()
    if (!uid) return
    const { data: me } = await supabase.from('profiles').select('full_name').eq('id', uid).maybeSingle()
    await supabase.from('audit_log').insert({
      actor_id: uid,
      actor_name: (me?.full_name as string) ?? 'Someone',
      action,
      entity,
      entity_id: entityId,
      detail,
    })
  } catch {
    /* auditing must never break the operation it describes */
  }
}

export function useAdminData() {
  const [people, setPeople] = useState<AdminProfile[]>([])
  const [groups, setGroups] = useState<AdminGroup[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const uid = await currentUserId()
      const [profilesRes, groupsRes, membersRes, auditRes, billingRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, role').order('full_name'),
        supabase.from('groups').select('id, name, color'),
        supabase.from('group_members').select('id, group_id, user_id, member_role'),
        supabase
          .from('audit_log')
          .select('id, actor_name, action, entity, detail, created_at')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('billing_subscriptions').select('user_id, plan, status'),
      ])
      if (profilesRes.error) throw profilesRes.error

      // Only Super Admins may read others' plans (0013); everyone else gets free/none here.
      const plans = new Map(((billingRes.data ?? []) as { user_id: string; plan: string; status: string }[]).map(b => [String(b.user_id), b]))
      setPeople(
        (profilesRes.data ?? []).map(p => {
          const b = plans.get(String(p.id))
          return {
            id: String(p.id),
            name: (p.full_name as string) ?? '—',
            email: (p.email as string) ?? '',
            role: (p.role as UserRole) ?? 'user',
            plan: b && isPlanId(b.plan) ? b.plan : 'free',
            planStatus: b?.status ?? 'none',
          }
        }),
      )

      const members = (membersRes.data ?? []) as { group_id: string; user_id: string; member_role: string }[]
      setGroups(
        (groupsRes.data ?? []).map(g => ({
          id: String(g.id),
          name: String(g.name),
          color: String(g.color ?? '#7C6FFF'),
          memberCount: members.filter(m => m.group_id === g.id).length,
          iAmAdmin: members.some(m => m.group_id === g.id && m.user_id === uid && m.member_role === 'admin'),
        })),
      )

      setAudit(
        (auditRes.data ?? []).map(a => ({
          id: String(a.id),
          actorName: (a.actor_name as string) ?? 'Someone',
          action: String(a.action),
          entity: String(a.entity),
          detail: (a.detail as Record<string, unknown>) ?? {},
          at: String(a.created_at),
        })),
      )
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /** Super Admin only; the server refuses self-changes and non-admins. */
  const setUserRole = useCallback(
    async (userId: string, role: UserRole, name: string): Promise<string | null> => {
      if (!supabase) return 'Connect Supabase to manage roles.'
      const { error: err } = await supabase.from('profiles').update({ role }).eq('id', userId)
      if (err) return err.message.replace(/^.*?:\s*/, '')
      await recordAudit('role.changed', 'profile', userId, { name, role })
      await load()
      return null
    },
    [load],
  )

  /** Super Admin only: set someone's plan without Stripe (server function, service role). */
  const setUserPlan = useCallback(
    async (userId: string, plan: PlanId, name: string): Promise<string | null> => {
      if (!supabase) return 'Connect Supabase to manage plans.'
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) return 'Sign in again to continue.'
      try {
        const res = await fetch('/api/admin-set-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userId, plan }),
        })
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        if (res.status === 503) return 'Plan changes need SUPABASE_SERVICE_ROLE_KEY on the server.'
        if (!res.ok) return body.error ?? `Request failed (${res.status})`
      } catch (e) {
        return e instanceof Error ? e.message : 'Network error'
      }
      await recordAudit('plan.granted', 'profile', userId, { name, plan })
      await load()
      return null
    },
    [load],
  )

  /** Super Admin only. Removes the auth account; the profile cascades. */
  const removeUser = useCallback(
    async (userId: string, name: string): Promise<string | null> => {
      if (!supabase) return 'Connect Supabase to remove accounts.'
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) return 'Sign in again to continue.'
      try {
        const res = await fetch('/api/admin-delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userId }),
        })
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        if (res.status === 503) return 'Account removal needs SUPABASE_SERVICE_ROLE_KEY on the server.'
        if (!res.ok) return body.error ?? `Request failed (${res.status})`
      } catch (e) {
        return e instanceof Error ? e.message : 'Network error'
      }
      await recordAudit('user.removed', 'profile', userId, { name })
      await load()
      return null
    },
    [load],
  )

  /** Super Admins and the group's own admins (RLS: "groups admin all"). Members cascade. */
  const deleteGroup = useCallback(
    async (groupId: string, name: string): Promise<string | null> => {
      if (!supabase) return 'Connect Supabase to manage groups.'
      const { error: err } = await supabase.from('groups').delete().eq('id', groupId)
      if (err) return err.message.replace(/^.*?:\s*/, '')
      await recordAudit('group.deleted', 'group', groupId, { name })
      await load()
      return null
    },
    [load],
  )

  const membersOf = useCallback(async (groupId: string): Promise<AdminMember[]> => {
    if (!supabase) return []
    const { data } = await supabase
      .from('group_members')
      .select('id, user_id, member_role, status, profiles!user_id ( full_name, email )')
      .eq('group_id', groupId)
    type Row = {
      id: string
      user_id: string
      member_role: 'admin' | 'member'
      status?: 'active' | 'invited' | 'requested'
      profiles: { full_name: string | null; email: string | null } | null
    }
    return ((data ?? []) as unknown as Row[]).map(r => ({
      membershipId: String(r.id),
      userId: String(r.user_id),
      name: r.profiles?.full_name ?? '—',
      email: r.profiles?.email ?? '',
      memberRole: r.member_role,
      status: r.status ?? 'active',
    }))
  }, [])

  const setMemberRole = useCallback(
    async (membershipId: string, groupId: string, memberRole: 'admin' | 'member', name: string): Promise<string | null> => {
      if (!supabase) return 'Connect Supabase to manage members.'
      const { error: err } = await supabase.from('group_members').update({ member_role: memberRole }).eq('id', membershipId)
      if (err) return err.message
      await recordAudit('member.role_changed', 'group', groupId, { name, memberRole })
      await load()
      return null
    },
    [load],
  )

  const removeMember = useCallback(
    async (membershipId: string, groupId: string, name: string): Promise<string | null> => {
      if (!supabase) return 'Connect Supabase to manage members.'
      const { error: err } = await supabase.from('group_members').delete().eq('id', membershipId)
      if (err) return err.message
      await recordAudit('member.removed', 'group', groupId, { name })
      await load()
      return null
    },
    [load],
  )

  const inviteToGroup = useCallback(
    async (groupId: string, email: string, memberRole: 'admin' | 'member'): Promise<string | null> => {
      if (!supabase) return 'Connect Supabase to send invites.'
      const clean = email.trim().toLowerCase()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return 'Enter a valid email address.'
      // Same path as the Groups tab: creates a pending invitation the person must accept.
      const { error: err } = await supabase.rpc('add_group_member', { p_group: groupId, p_email: clean })
      if (err) return err.message.replace(/^.*?:\s*/, '')
      if (memberRole === 'admin') {
        const { data: prof } = await supabase.from('profiles').select('id').ilike('email', clean).maybeSingle()
        if (prof) await supabase.from('group_members').update({ member_role: 'admin' }).eq('group_id', groupId).eq('user_id', String(prof.id))
      }
      await recordAudit('member.invited', 'group', groupId, { email: clean, memberRole })
      await load()
      return null
    },
    [load],
  )

  return { people, groups, audit, loading, error, reload: load, setUserRole, setUserPlan, removeUser, deleteGroup, membersOf, setMemberRole, removeMember, inviteToGroup }
}
