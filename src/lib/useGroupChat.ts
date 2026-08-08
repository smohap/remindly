import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { makeStore } from './localStore'
import { supabase } from './supabase'

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

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
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

interface MessageRow {
  id: string
  author_id: string
  body: string
  created_at: string
  author?: { full_name: string | null } | null
}

/**
 * Group chat is multi-writer, so it can't use the whole-collection sync the
 * personal workspace uses — that would overwrite other people's messages.
 * Instead we append rows and re-fetch, subscribing to Postgres changes so other
 * members' messages arrive live when Supabase is configured.
 */
export function useGroupChat(groupId: string) {
  const all = useSyncExternalStore(store.subscribe, store.get, store.get)
  const [remote, setRemote] = useState<ChatMessage[] | null>(null)
  const myId = useRef<string | null>(null)

  // Locally-created groups have ids like "g-1699…", which aren't real rows.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(groupId)
  const dbMode = Boolean(supabase) && isUuid

  const load = useCallback(async () => {
    if (!supabase || !isUuid) return
    const { data: userData } = await supabase.auth.getUser()
    myId.current = userData.user?.id ?? null

    const { data, error } = await supabase
      .from('group_messages')
      .select('id, author_id, body, created_at, author:profiles ( full_name )')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(200)
    if (error) return

    setRemote(
      ((data ?? []) as unknown as MessageRow[]).map(r => {
        const self = r.author_id === myId.current
        const name = self ? 'You' : (r.author?.full_name ?? 'Someone')
        return {
          id: r.id,
          authorName: name,
          authorInitials: initialsOf(self ? 'ME' : name),
          body: r.body,
          at: r.created_at,
          self,
        }
      }),
    )
  }, [groupId, isUuid])

  useEffect(() => {
    if (!dbMode || !supabase) return
    void load()
    const client = supabase
    const channel = client
      .channel(`group_messages:${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        () => {
          void load()
        },
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [dbMode, groupId, load])

  const messages = dbMode && remote ? remote : (all[groupId] ?? [])

  const send = useCallback(
    async (body: string, authorName: string, authorInitials: string) => {
      const text = body.trim()
      if (!text) return

      if (dbMode && supabase) {
        const { data: userData } = await supabase.auth.getUser()
        const uid = userData.user?.id
        if (!uid) return
        const { error } = await supabase
          .from('group_messages')
          .insert({ group_id: groupId, author_id: uid, body: text.slice(0, 4000) })
        if (!error) await load()
        return
      }

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
    [dbMode, groupId, load],
  )

  return { messages, send, dbMode }
}

/** Message count for a group badge. */
export function useGroupChatCount(groupId: string) {
  const all = useSyncExternalStore(store.subscribe, store.get, store.get)
  return (all[groupId] ?? []).length
}
