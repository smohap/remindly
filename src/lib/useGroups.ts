import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { currentUserId } from './invoicesDb'
import { useAuth } from '../auth/AuthContext'

export interface Member {
  id: string
  /** Profile id when the group is stored in Postgres. */
  userId?: string
  name: string
  email: string
  initials: string
  role: 'admin' | 'member'
  /** active = member; invited = waiting on them; requested = waiting on an admin. */
  status: MembershipStatus
}

export type MembershipStatus = 'active' | 'invited' | 'requested'

export interface PersonHit {
  id: string
  name: string
  email: string
}

export interface GroupHit {
  id: string
  name: string
  color: string
  description?: string
  memberCount: number
  myStatus: MembershipStatus | null
}

export interface Group {
  id: string
  name: string
  color: string
  description?: string
  role: 'admin' | 'member'
  /** My own membership status in this group. */
  myStatus: MembershipStatus
  /** Share this so people can ask to join. */
  joinCode?: string
  /** False when the group is visible only through Super Admin rights. */
  isMember?: boolean
  members: Member[]
}

export const GROUP_COLORS = ['#7C6FFF', '#FF6FB0', '#4FD1FF', '#2DD4BF', '#FBBF24', '#FF6B6B']

const KEY = 'remindly.groups.v1'

function initialsOf(source: string) {
  const parts = source.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || '??'
}

function nameFromEmail(email: string) {
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

// ---- tiny localStorage-backed external store (demo mode; DB when signed in) ----
let groups: Group[] = load()
const listeners = new Set<() => void>()

function load(): Group[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Group[]) : []
  } catch {
    return []
  }
}

function commit(next: Group[]) {
  groups = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore quota / private mode */
  }
  listeners.forEach(l => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}


type MemberRow = { id: string; user_id: string; member_role: 'admin' | 'member'; status: MembershipStatus; profiles: { full_name: string | null; email: string | null } | null }

/** Pull the signed-in user's groups (as member or creator) with their members. */
async function loadFromDb(uid: string): Promise<{ groups: Group[]; error: string | null }> {
  if (!supabase) return { groups: [], error: null }
  const { data: gs, error: gErr } = await supabase.from('groups').select('id, name, color, description, join_code')
  if (gErr) return { groups: [], error: gErr.message }
  if (!gs || gs.length === 0) return { groups: [], error: null }
  const ids = gs.map(g => String(g.id))
  // group_members has two links to profiles (user_id, invited_by): name the one we mean.
  const { data: ms, error: mErr } = await supabase
    .from('group_members')
    .select('id, group_id, user_id, member_role, status, profiles!user_id ( full_name, email )')
    .in('group_id', ids)
  if (mErr) return { groups: [], error: mErr.message }
  const rows = (ms ?? []) as unknown as (MemberRow & { group_id: string })[]
  const groups: Group[] = gs.map(g => {
    const members: Member[] = rows
      .filter(m => String(m.group_id) === String(g.id))
      .map(m => {
        const name = m.profiles?.full_name || nameFromEmail(m.profiles?.email ?? 'member')
        return { id: String(m.id), userId: String(m.user_id), name, email: m.profiles?.email ?? '', initials: initialsOf(name), role: m.member_role, status: m.status ?? 'active' }
      })
    const mine = members.find(m => m.userId === uid)
    // No membership row at all means we only see this group as a Super Admin; treat as observer, not member.
    return {
      id: String(g.id),
      name: String(g.name),
      color: String(g.color ?? '#7C6FFF'),
      description: (g.description as string | null) ?? undefined,
      role: mine?.status === 'active' ? mine.role : 'member',
      myStatus: mine?.status ?? 'active',
      isMember: Boolean(mine),
      joinCode: (g.join_code as string | null) ?? undefined,
      members,
    }
  })
  return { groups, error: null }
}

export function useGroups() {
  const local = useSyncExternalStore(subscribe, () => groups, () => groups)
  const { user } = useAuth()
  const [db, setDb] = useState<Group[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dbMode = Boolean(supabase)

  const reload = useCallback(async () => {
    if (!supabase) return
    const uid = await currentUserId()
    if (!uid) return
    const { groups: loaded, error: err } = await loadFromDb(uid)
    setDb(loaded)
    if (err) setError(err)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const createGroup = useCallback(
    async (name: string, color: string, description?: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      setError(null)
      if (supabase) {
        const { error: err } = await supabase.rpc('create_group', { p_name: trimmed, p_color: color, p_description: description ?? null })
        if (err) setError(err.message)
        await reload()
        return
      }
      // Demo mode: the creator is the group's admin, using the signed-in identity.
      const me = user?.name ?? 'You'
      const g: Group = {
        id: `g-${Date.now()}`,
        name: trimmed,
        color,
        description: description?.trim() || undefined,
        role: 'admin',
        myStatus: 'active',
        joinCode: Math.random().toString(36).slice(2, 10).toUpperCase(),
        members: [{ id: `me-${Date.now()}`, name: me, email: user?.email ?? '', initials: initialsOf(me), role: 'admin', status: 'active' }],
      }
      commit([g, ...groups])
    },
    [reload, user],
  )

  const addMember = useCallback(
    async (groupId: string, emailOrName: string): Promise<string | null> => {
      const value = emailOrName.trim()
      if (!value) return null
      setError(null)
      if (supabase) {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (!token) return 'Sign in again to continue.'
        try {
          const res = await fetch('/api/invite-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ groupId, email: value, origin: window.location.origin }),
          })
          const body = (await res.json().catch(() => ({}))) as { error?: string; emailed?: boolean }
          if (res.status === 503) return 'Invitations need SUPABASE_SERVICE_ROLE_KEY on the server.'
          if (!res.ok) {
            setError(body.error ?? `Request failed (${res.status})`)
            return body.error ?? `Request failed (${res.status})`
          }
          await reload()
          return body.emailed ? `Invitation email sent to ${value} — they'll appear here once they've signed up and accepted.` : `Invitation sent to ${value}.`
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Network error'
          setError(msg)
          return msg
        }
      }
      const isEmail = value.includes('@')
      const email = isEmail ? value : `${value.toLowerCase().replace(/\s+/g, '.')}@example.com`
      const name = isEmail ? nameFromEmail(value) : value
      // Demo: invitations stay pending until the invitee accepts (nobody else is signed in here).
      const member: Member = { id: `m-${Date.now()}`, name, email, initials: initialsOf(name), role: 'member', status: 'invited' }
      commit(groups.map(g => (g.id === groupId ? { ...g, members: [...g.members, member] } : g)))
      return `Invitation sent to ${email}.`
    },
    [reload],
  )

  /** Typeahead for the invite box. */
  const searchPeople = useCallback(async (q: string): Promise<PersonHit[]> => {
    if (!supabase || q.trim().length < 2) return []
    const { data } = await supabase.rpc('search_profiles', { q: q.trim() })
    return ((data ?? []) as { id: string; full_name: string | null; email: string | null }[]).map(r => ({ id: String(r.id), name: r.full_name || nameFromEmail(r.email ?? ''), email: r.email ?? '' }))
  }, [])

  /** Find groups by name, with the caller's standing in each. */
  const searchGroups = useCallback(async (q: string): Promise<GroupHit[]> => {
    if (!supabase || q.trim().length < 2) return []
    const { data } = await supabase.rpc('search_groups', { q: q.trim() })
    return ((data ?? []) as { id: string; name: string; color: string | null; description: string | null; member_count: number; my_status: string | null }[]).map(r => ({
      id: String(r.id),
      name: String(r.name),
      color: r.color ?? '#7C6FFF',
      description: r.description ?? undefined,
      memberCount: Number(r.member_count ?? 0),
      myStatus: (r.my_status as MembershipStatus | null) ?? null,
    }))
  }, [])

  const requestToJoinGroup = useCallback(
    async (groupId: string): Promise<string | null> => {
      if (!supabase) return 'Joining groups needs a signed-in account.'
      const { error: err } = await supabase.rpc('request_to_join_group', { p_group: groupId })
      if (err) return err.message.replace(/^.*?:\s*/, '')
      await reload()
      return null
    },
    [reload],
  )

  const removeMember = useCallback(
    async (groupId: string, memberId: string) => {
      if (supabase) {
        const { error: err } = await supabase.from('group_members').delete().eq('id', memberId)
        if (err) setError(err.message)
        await reload()
        return
      }
      commit(groups.map(g => (g.id === groupId ? { ...g, members: g.members.filter(m => m.id !== memberId) } : g)))
    },
    [reload],
  )

  /** Ask to join a group by its code; an admin has to approve. */
  const requestToJoin = useCallback(
    async (code: string): Promise<string | null> => {
      const clean = code.trim()
      if (!clean) return 'Enter the group code.'
      setError(null)
      if (supabase) {
        const { error: err } = await supabase.rpc('request_to_join', { p_code: clean })
        if (err) return err.message.replace(/^.*?:\s*/, '')
        await reload()
        return null
      }
      return 'Joining by code needs a signed-in account.'
    },
    [reload],
  )

  /** Accept/decline an invitation (invitee) or approve/reject a request (admin). */
  const respond = useCallback(
    async (groupId: string, membershipId: string, accept: boolean) => {
      setError(null)
      if (supabase) {
        const { error: err } = await supabase.rpc('respond_membership', { p_membership: membershipId, p_accept: accept })
        if (err) setError(err.message.replace(/^.*?:\s*/, ''))
        await reload()
        return
      }
      commit(
        groups.map(g =>
          g.id !== groupId ? g : { ...g, members: accept ? g.members.map(m => (m.id === membershipId ? { ...m, status: 'active' as const } : m)) : g.members.filter(m => m.id !== membershipId) },
        ),
      )
    },
    [reload],
  )

  const deleteGroup = useCallback(
    async (groupId: string) => {
      if (supabase) {
        const { error: err } = await supabase.from('groups').delete().eq('id', groupId)
        if (err) setError(err.message)
        await reload()
        return
      }
      commit(groups.filter(g => g.id !== groupId))
    },
    [reload],
  )

  const all = dbMode ? (db ?? []) : local
  // Groups I'm actually in, invitations waiting on me, and requests waiting on me as an admin.
  const groupsList = all.filter(g => g.myStatus === 'active')
  const invitations = all.filter(g => g.myStatus === 'invited')
  const awaiting = all.filter(g => g.myStatus === 'requested')
  const pendingRequests = groupsList.filter(g => g.role === 'admin').reduce((n, g) => n + g.members.filter(m => m.status === 'requested').length, 0)
  return {
    groups: groupsList,
    invitations,
    awaiting,
    pendingCount: invitations.length + pendingRequests,
    loading: dbMode && db === null,
    error,
    createGroup,
    addMember,
    removeMember,
    deleteGroup,
    requestToJoin,
    requestToJoinGroup,
    searchPeople,
    searchGroups,
    respond,
    reload,
  }
}
