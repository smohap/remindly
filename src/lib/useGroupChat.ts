import { useCallback, useSyncExternalStore } from 'react'
import { makeStore } from './localStore'

export interface ChatMessage {
  id: string
  authorName: string
  authorInitials: string
  body: string
  at: string // ISO
  self: boolean
}

type State = Record<string, ChatMessage[]>

function ago(mins: number) {
  return new Date(Date.now() - mins * 60000).toISOString()
}

const seed: State = {
  g1: [
    { id: 'c1', authorName: 'Tama Wright', authorInitials: 'TW', body: 'Safety checklist is done for Site A — uploaded the photos.', at: ago(95), self: false },
    { id: 'c2', authorName: 'Sione Vaka', authorInitials: 'SV', body: 'Nice one. I still need to sign the contract renewal.', at: ago(48), self: false },
  ],
  g2: [
    { id: 'c3', authorName: 'Coach Riley', authorInitials: 'CR', body: 'Practice moved to 6:30pm — bring boots, ground is wet.', at: ago(180), self: false },
  ],
}

const store = makeStore<State>('remindly.groupChat.v1', seed)

export function formatTime(iso: string): string {
  const d = new Date(iso)
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  if (mins < 1440) return `${Math.round(mins / 60)}h`
  return new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short' }).format(d)
}

export function useGroupChat(groupId: string) {
  const all = useSyncExternalStore(store.subscribe, store.get, store.get)
  const messages = all[groupId] ?? []

  const send = useCallback(
    (body: string, authorName: string, authorInitials: string) => {
      const text = body.trim()
      if (!text) return
      const msg: ChatMessage = {
        id: `m-${Date.now()}`,
        authorName,
        authorInitials,
        body: text,
        at: new Date().toISOString(),
        self: true,
      }
      const cur = store.get()
      store.set({ ...cur, [groupId]: [...(cur[groupId] ?? []), msg] })
    },
    [groupId],
  )

  return { messages, send }
}

/** Unread-ish count for a group badge (messages from others). */
export function useGroupChatCount(groupId: string) {
  const all = useSyncExternalStore(store.subscribe, store.get, store.get)
  return (all[groupId] ?? []).length
}
