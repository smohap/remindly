import { useCallback, useSyncExternalStore } from 'react'

export interface Member {
  id: string
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

const seed: Group[] = [
  {
    id: 'g1',
    name: 'Acme · Site A crew',
    color: '#FF6B6B',
    description: 'Compliance and safety coordination for Site A',
    role: 'admin',
    members: [
      { id: 'm1', name: 'Priya Nair', email: 'priya@acme.co.nz', initials: 'PN', role: 'admin' },
      { id: 'm2', name: 'Tama Wright', email: 'tama@acme.co.nz', initials: 'TW', role: 'member' },
      { id: 'm3', name: 'Sione Vaka', email: 'sione@acme.co.nz', initials: 'SV', role: 'member' },
    ],
  },
  {
    id: 'g2',
    name: 'Wellington Rugby',
    color: '#2DD4BF',
    description: 'Training schedule and match-day reminders',
    role: 'member',
    members: [
      { id: 'm4', name: 'Priya Nair', email: 'priya@acme.co.nz', initials: 'PN', role: 'member' },
      { id: 'm5', name: 'Coach Riley', email: 'riley@welly-rugby.nz', initials: 'CR', role: 'admin' },
    ],
  },
  {
    id: 'g3',
    name: 'Personal',
    color: '#7C6FFF',
    description: 'Your personal reminders',
    role: 'admin',
    members: [{ id: 'm6', name: 'Priya Nair', email: 'priya@acme.co.nz', initials: 'PN', role: 'admin' }],
  },
]

// ---- tiny localStorage-backed external store ----
let groups: Group[] = load()
const listeners = new Set<() => void>()

function load(): Group[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Group[]) : seed
  } catch {
    return seed
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

export function useGroups() {
  const value = useSyncExternalStore(subscribe, () => groups, () => groups)

  const createGroup = useCallback((name: string, color: string, description?: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const g: Group = {
      id: `g-${Date.now()}`,
      name: trimmed,
      color,
      description: description?.trim() || undefined,
      role: 'admin',
      members: [{ id: `me-${Date.now()}`, name: 'Priya Nair', email: 'priya@acme.co.nz', initials: 'PN', role: 'admin' }],
    }
    commit([g, ...groups])
  }, [])

  const addMember = useCallback((groupId: string, emailOrName: string) => {
    const value = emailOrName.trim()
    if (!value) return
    const isEmail = value.includes('@')
    const email = isEmail ? value : `${value.toLowerCase().replace(/\s+/g, '.')}@example.com`
    const name = isEmail ? nameFromEmail(value) : value
    const member: Member = { id: `m-${Date.now()}`, name, email, initials: initialsOf(name), role: 'member' }
    commit(groups.map(g => (g.id === groupId ? { ...g, members: [...g.members, member] } : g)))
  }, [])

  const removeMember = useCallback((groupId: string, memberId: string) => {
    commit(groups.map(g => (g.id === groupId ? { ...g, members: g.members.filter(m => m.id !== memberId) } : g)))
  }, [])

  const deleteGroup = useCallback((groupId: string) => {
    commit(groups.filter(g => g.id !== groupId))
  }, [])

  return { groups: value, createGroup, addMember, removeMember, deleteGroup }
}
