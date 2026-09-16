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
}

export interface Group {
  id: string
  name: string
  color: string
  description?: string
  role: 'admin' | 'member'
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


type MemberRow = { id: string; user_id: string; member_role: 'admin' | 'member'; profiles: { full_name: string | null; email: string | null } | null }

/** Pull the signed-in user's groups (as member or creator) with their members. */
async function loadFromDb(uid: string): Promise<Group[]> {
  if (!supabase) return []
  const { data: gs } = await supabase.from('groups').select('id, name, color, description')
  if (!gs || gs.length === 0) return []
  const ids = gs.map(g => String(g.id))
  const { data: ms } = await supabase.from('group_members').select('id, group_id, user_id, member_role, profiles ( full_name, email )').in('group_id', ids)
  const rows = ((ms ?? []) as unknown as (MemberRow & { group_id: string })[])
  return gs.map(g => {
    const members: Member[] = rows
      .filter(m => String(m.group_id) === String(g.id))
      .map(m => {
        const name = m.profiles?.full_name || nameFromEmail(m.profiles?.email ?? 'member')
        return { id: String(m.id), userId: String(m.user_id), name, email: m.profiles?.email ?? '', initials: initialsOf(name), role: m.member_role }
      })
    const mine = members.find(m => m.userId === uid)
    return { id: String(g.id), name: String(g.name), color: String(g.color ?? '#7C6FFF'), description: (g.description as string | null) ?? undefined, role: mine?.role ?? 'member', members }
  })
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
    setDb(await loadFromDb(uid))
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
        members: [{ id: `me-${Date.now()}`, name: me, email: user?.email ?? '', initials: initialsOf(me), role: 'admin' }],
      }
      commit([g, ...groups])
    },
    [reload, user],
  )

  const addMember = useCallback(
    async (groupId: string, emailOrName: string) => {
      const value = emailOrName.trim()
      if (!value) return
      setError(null)
      if (supabase) {
        const { error: err } = await supabase.rpc('add_group_member', { p_group: groupId, p_email: value })
        if (err) setError(err.message.replace(/^.*?:\s*/, ''))
        await reload()
        return
      }
      const isEmail = value.includes('@')
      const email = isEmail ? value : `${value.toLowerCase().replace(/\s+/g, '.')}@example.com`
      const name = isEmail ? nameFromEmail(value) : value
      const member: Member = { id: `m-${Date.now()}`, name, email, initials: initialsOf(name), role: 'member' }
      commit(groups.map(g => (g.id === groupId ? { ...g, members: [...g.members, member] } : g)))
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

  return { groups: dbMode ? (db ?? []) : local, loading: dbMode && db === null, error, createGroup, addMember, removeMember, deleteGroup, reload }
}
