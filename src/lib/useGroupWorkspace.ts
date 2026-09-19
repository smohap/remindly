import { useCallback, useEffect, useState } from 'react'
import { currentUserId } from './invoicesDb'
import { makeStore } from './localStore'
import { supabase } from './supabase'

/**
 * A group's shared workspace: lists, notes and documents. Admins always have
 * full access; members read, and write only when the admin has switched on
 * "members can edit" (enforced by RLS — see 0012). Whether a member may see
 * it at all depends on their plan, which the view checks.
 */

export interface GroupListItem {
  id: string
  text: string
  done: boolean
}
export interface GroupList {
  id: string
  name: string
  items: GroupListItem[]
  updatedAt: string
}
export interface GroupNote {
  id: string
  title: string
  body: string
  updatedAt: string
}
export interface GroupDoc {
  id: string
  name: string
  path: string
  size: number
  mime?: string
  createdAt: string
}

interface Workspace {
  lists: GroupList[]
  notes: GroupNote[]
  docs: GroupDoc[]
}

const empty: Workspace = { lists: [], notes: [], docs: [] }
const local = makeStore<Record<string, Workspace>>('remindly.groupWorkspace.v1', {})

export const newWorkspaceId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
const clean = (e: unknown) => (e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e)).replace(/^.*?:\s*/, '')
const NO_ACCESS = "You don't have edit access to this group's workspace."

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function useGroupWorkspace(groupId: string) {
  const [ws, setWs] = useState<Workspace>(() => (supabase ? empty : (local.get()[groupId] ?? empty)))
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState<string | null>(null)

  const commitLocal = useCallback(
    (next: Workspace) => {
      setWs(next)
      local.set({ ...local.get(), [groupId]: next })
    },
    [groupId],
  )

  const reload = useCallback(async () => {
    if (!supabase) return
    const [l, n, d] = await Promise.all([
      supabase.from('group_lists').select('id, name, items, updated_at').eq('group_id', groupId).order('updated_at', { ascending: false }),
      supabase.from('group_notes').select('id, title, body, updated_at').eq('group_id', groupId).order('updated_at', { ascending: false }),
      supabase.from('group_docs').select('id, name, path, size, mime, created_at').eq('group_id', groupId).order('created_at', { ascending: false }),
    ])
    const err = l.error ?? n.error ?? d.error
    if (err) setError(clean(err))
    setWs({
      lists: (l.data ?? []).map(r => ({ id: String(r.id), name: String(r.name), items: (Array.isArray(r.items) ? r.items : []) as GroupListItem[], updatedAt: String(r.updated_at) })),
      notes: (n.data ?? []).map(r => ({ id: String(r.id), title: String(r.title), body: String(r.body ?? ''), updatedAt: String(r.updated_at) })),
      docs: (d.data ?? []).map(r => ({ id: String(r.id), name: String(r.name), path: String(r.path), size: Number(r.size ?? 0), mime: (r.mime as string | null) ?? undefined, createdAt: String(r.created_at) })),
    })
    setLoading(false)
  }, [groupId])

  useEffect(() => {
    void reload()
  }, [reload])

  /** Run a write against Postgres (reporting RLS refusals readably) or the local copy. */
  const write = useCallback(
    async (db: () => PromiseLike<{ error: { message: string } | null }>, localNext: () => Workspace) => {
      setError(null)
      if (supabase) {
        const { error: err } = await db()
        if (err) setError(/policy|permission|denied|row-level/i.test(err.message) ? NO_ACCESS : clean(err))
        await reload()
        return
      }
      commitLocal(localNext())
    },
    [commitLocal, reload],
  )

  // ---- lists ----
  const createList = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return Promise.resolve()
      const id = newWorkspaceId()
      return write(
        async () => supabase!.from('group_lists').insert({ id, group_id: groupId, name: trimmed, items: [], created_by: await currentUserId() }),
        () => ({ ...ws, lists: [{ id, name: trimmed, items: [], updatedAt: new Date().toISOString() }, ...ws.lists] }),
      )
    },
    [groupId, write, ws],
  )
  const saveListItems = useCallback(
    (listId: string, items: GroupListItem[]) =>
      write(
        () => supabase!.from('group_lists').update({ items, updated_at: new Date().toISOString() }).eq('id', listId),
        () => ({ ...ws, lists: ws.lists.map(l => (l.id === listId ? { ...l, items, updatedAt: new Date().toISOString() } : l)) }),
      ),
    [write, ws],
  )
  const deleteList = useCallback(
    (listId: string) => write(() => supabase!.from('group_lists').delete().eq('id', listId), () => ({ ...ws, lists: ws.lists.filter(l => l.id !== listId) })),
    [write, ws],
  )

  // ---- notes ----
  const saveNote = useCallback(
    (note: { id?: string; title: string; body: string }) => {
      const title = note.title.trim() || 'Untitled note'
      const id = note.id ?? newWorkspaceId()
      const now = new Date().toISOString()
      return write(
        async () => supabase!.from('group_notes').upsert({ id, group_id: groupId, title, body: note.body, updated_by: await currentUserId(), updated_at: now }, { onConflict: 'id' }),
        () => {
          const exists = ws.notes.some(n => n.id === id)
          const next = { id, title, body: note.body, updatedAt: now }
          return { ...ws, notes: exists ? ws.notes.map(n => (n.id === id ? next : n)) : [next, ...ws.notes] }
        },
      )
    },
    [groupId, write, ws],
  )
  const deleteNote = useCallback(
    (id: string) => write(() => supabase!.from('group_notes').delete().eq('id', id), () => ({ ...ws, notes: ws.notes.filter(n => n.id !== id) })),
    [write, ws],
  )

  // ---- docs ----
  const uploadDoc = useCallback(
    async (file: File): Promise<string | null> => {
      if (file.size > 20 * 1024 * 1024) return 'Files are limited to 20 MB.'
      setError(null)
      if (!supabase) {
        // Demo mode keeps a record but not the bytes.
        commitLocal({ ...ws, docs: [{ id: newWorkspaceId(), name: file.name, path: '', size: file.size, mime: file.type, createdAt: new Date().toISOString() }, ...ws.docs] })
        return null
      }
      const safe = file.name.replace(/[^\w.-]+/g, '_')
      const path = `${groupId}/${newWorkspaceId()}-${safe}`
      const up = await supabase.storage.from('group-docs').upload(path, file, { contentType: file.type || undefined, upsert: false })
      if (up.error) return /policy|permission|denied|row-level/i.test(up.error.message) ? NO_ACCESS : clean(up.error)
      const { error: err } = await supabase.from('group_docs').insert({ group_id: groupId, name: file.name, path, size: file.size, mime: file.type || null, uploaded_by: await currentUserId() })
      if (err) return clean(err)
      await reload()
      return null
    },
    [commitLocal, groupId, reload, ws],
  )
  const deleteDoc = useCallback(
    async (doc: GroupDoc) => {
      if (supabase && doc.path) await supabase.storage.from('group-docs').remove([doc.path])
      return write(() => supabase!.from('group_docs').delete().eq('id', doc.id), () => ({ ...ws, docs: ws.docs.filter(d => d.id !== doc.id) }))
    },
    [write, ws],
  )
  /** Short-lived download link (the bucket is private). */
  const docUrl = useCallback(async (doc: GroupDoc): Promise<string | null> => {
    if (!supabase || !doc.path) return null
    const { data } = await supabase.storage.from('group-docs').createSignedUrl(doc.path, 300, { download: doc.name })
    return data?.signedUrl ?? null
  }, [])

  return { ...ws, loading, error, reload, createList, saveListItems, deleteList, saveNote, deleteNote, uploadDoc, deleteDoc, docUrl }
}
