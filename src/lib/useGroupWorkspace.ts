import { useCallback, useEffect, useState } from 'react'
import { currentUserId } from './invoicesDb'
import { makeStore } from './localStore'
import { supabase } from './supabase'

/**
 * A group's shared workspace: lists, notes and documents.
 *
 * Access is set per list and per note (0015): each carries a default for
 * the group's members plus per-member overrides, all chosen by group admins,
 * who always have full access and alone create, rename and delete. Docs are
 * open to every member on a qualifying plan (the view checks the plan);
 * admins or the uploader remove them. RLS is the real gate.
 */

/** none = hidden; read = view; write = tick / add items or edit the note body. */
export type WorkspaceAccess = 'none' | 'read' | 'write'
export const WORKSPACE_ACCESS_LABEL: Record<WorkspaceAccess, string> = { none: 'No access', read: 'Read', write: 'Read & write' }

export interface GroupListItem {
  id: string
  text: string
  done: boolean
}
interface Shared {
  /** Access for members without an override. */
  defaultAccess: WorkspaceAccess
  /** Per-member overrides keyed by profile id. */
  overrides: Record<string, WorkspaceAccess>
}
export interface GroupList extends Shared {
  id: string
  name: string
  items: GroupListItem[]
  updatedAt: string
}
export interface GroupNote extends Shared {
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
  /** True when the signed-in user uploaded it (so they may remove it). */
  mine: boolean
}

interface Workspace {
  lists: GroupList[]
  notes: GroupNote[]
  docs: GroupDoc[]
}

/** What one member may do with a list or note. */
export function accessFor(item: Shared, userId: string | undefined, isAdmin: boolean): WorkspaceAccess {
  if (isAdmin) return 'write'
  return (userId && item.overrides[userId]) || item.defaultAccess
}

const empty: Workspace = { lists: [], notes: [], docs: [] }
const local = makeStore<Record<string, Workspace>>('remindly.groupWorkspace.v2', {})

export const newWorkspaceId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
const clean = (e: unknown) => (e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e)).replace(/^.*?:\s*/, '')
const NO_ACCESS = "You don't have access to do that here."
const isAccess = (v: unknown): v is WorkspaceAccess => v === 'none' || v === 'read' || v === 'write'

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

type AccessRow = { user_id: string; access: string }
const overridesOf = (rows: AccessRow[] | null | undefined) =>
  Object.fromEntries((rows ?? []).filter(r => isAccess(r.access)).map(r => [String(r.user_id), r.access as WorkspaceAccess]))

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
    const uid = await currentUserId()
    const [l, n, d] = await Promise.all([
      supabase.from('group_lists').select('id, name, items, default_access, updated_at, group_list_access ( user_id, access )').eq('group_id', groupId).order('updated_at', { ascending: false }),
      supabase.from('group_notes').select('id, title, body, default_access, updated_at, group_note_access ( user_id, access )').eq('group_id', groupId).order('updated_at', { ascending: false }),
      supabase.from('group_docs').select('id, name, path, size, mime, uploaded_by, created_at').eq('group_id', groupId).order('created_at', { ascending: false }),
    ])
    const err = l.error ?? n.error ?? d.error
    if (err) setError(clean(err))
    setWs({
      lists: (l.data ?? []).map(r => ({
        id: String(r.id),
        name: String(r.name),
        items: (Array.isArray(r.items) ? r.items : []) as GroupListItem[],
        defaultAccess: isAccess(r.default_access) ? r.default_access : 'read',
        overrides: overridesOf(r.group_list_access as AccessRow[] | null),
        updatedAt: String(r.updated_at),
      })),
      notes: (n.data ?? []).map(r => ({
        id: String(r.id),
        title: String(r.title),
        body: String(r.body ?? ''),
        defaultAccess: isAccess(r.default_access) ? r.default_access : 'read',
        overrides: overridesOf(r.group_note_access as AccessRow[] | null),
        updatedAt: String(r.updated_at),
      })),
      docs: (d.data ?? []).map(r => ({
        id: String(r.id),
        name: String(r.name),
        path: String(r.path),
        size: Number(r.size ?? 0),
        mime: (r.mime as string | null) ?? undefined,
        createdAt: String(r.created_at),
        mine: Boolean(uid) && String(r.uploaded_by) === uid,
      })),
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

  const now = () => new Date().toISOString()

  // ---- lists (create / rename / delete / access: admins; items: writers) ----
  const createList = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return Promise.resolve()
      const id = newWorkspaceId()
      return write(
        async () => supabase!.from('group_lists').insert({ id, group_id: groupId, name: trimmed, items: [], created_by: await currentUserId() }),
        () => ({ ...ws, lists: [{ id, name: trimmed, items: [], defaultAccess: 'read', overrides: {}, updatedAt: now() }, ...ws.lists] }),
      )
    },
    [groupId, write, ws],
  )
  const renameList = useCallback(
    (listId: string, name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return Promise.resolve()
      return write(
        () => supabase!.from('group_lists').update({ name: trimmed, updated_at: now() }).eq('id', listId),
        () => ({ ...ws, lists: ws.lists.map(l => (l.id === listId ? { ...l, name: trimmed, updatedAt: now() } : l)) }),
      )
    },
    [write, ws],
  )
  const saveListItems = useCallback(
    (listId: string, items: GroupListItem[]) =>
      write(
        () => supabase!.from('group_lists').update({ items, updated_at: now() }).eq('id', listId),
        () => ({ ...ws, lists: ws.lists.map(l => (l.id === listId ? { ...l, items, updatedAt: now() } : l)) }),
      ),
    [write, ws],
  )
  const deleteList = useCallback(
    (listId: string) => write(() => supabase!.from('group_lists').delete().eq('id', listId), () => ({ ...ws, lists: ws.lists.filter(l => l.id !== listId) })),
    [write, ws],
  )
  /** Default for members without an override. */
  const setListDefault = useCallback(
    (listId: string, access: WorkspaceAccess) =>
      write(
        () => supabase!.from('group_lists').update({ default_access: access }).eq('id', listId),
        () => ({ ...ws, lists: ws.lists.map(l => (l.id === listId ? { ...l, defaultAccess: access } : l)) }),
      ),
    [write, ws],
  )
  /** Override for one member; `null` returns them to the default. */
  const setListMemberAccess = useCallback(
    (listId: string, userId: string, access: WorkspaceAccess | null) =>
      write(
        () => (access ? supabase!.from('group_list_access').upsert({ list_id: listId, user_id: userId, access }) : supabase!.from('group_list_access').delete().match({ list_id: listId, user_id: userId })),
        () => ({
          ...ws,
          lists: ws.lists.map(l => {
            if (l.id !== listId) return l
            const overrides = { ...l.overrides }
            if (access) overrides[userId] = access
            else delete overrides[userId]
            return { ...l, overrides }
          }),
        }),
      ),
    [write, ws],
  )

  // ---- notes (create / delete / access: admins; title+body: writers) ----
  const saveNote = useCallback(
    (note: { id?: string; title: string; body: string }) => {
      const title = note.title.trim() || 'Untitled note'
      const id = note.id ?? newWorkspaceId()
      const at = now()
      return write(
        async () =>
          note.id
            ? supabase!.from('group_notes').update({ title, body: note.body, updated_by: await currentUserId(), updated_at: at }).eq('id', id)
            : supabase!.from('group_notes').insert({ id, group_id: groupId, title, body: note.body, updated_by: await currentUserId(), updated_at: at }),
        () => {
          const existing = ws.notes.find(n => n.id === id)
          const next: GroupNote = { id, title, body: note.body, updatedAt: at, defaultAccess: existing?.defaultAccess ?? 'read', overrides: existing?.overrides ?? {} }
          return { ...ws, notes: existing ? ws.notes.map(n => (n.id === id ? next : n)) : [next, ...ws.notes] }
        },
      )
    },
    [groupId, write, ws],
  )
  const deleteNote = useCallback(
    (id: string) => write(() => supabase!.from('group_notes').delete().eq('id', id), () => ({ ...ws, notes: ws.notes.filter(n => n.id !== id) })),
    [write, ws],
  )
  const setNoteDefault = useCallback(
    (noteId: string, access: WorkspaceAccess) =>
      write(
        () => supabase!.from('group_notes').update({ default_access: access }).eq('id', noteId),
        () => ({ ...ws, notes: ws.notes.map(n => (n.id === noteId ? { ...n, defaultAccess: access } : n)) }),
      ),
    [write, ws],
  )
  const setNoteMemberAccess = useCallback(
    (noteId: string, userId: string, access: WorkspaceAccess | null) =>
      write(
        () => (access ? supabase!.from('group_note_access').upsert({ note_id: noteId, user_id: userId, access }) : supabase!.from('group_note_access').delete().match({ note_id: noteId, user_id: userId })),
        () => ({
          ...ws,
          notes: ws.notes.map(n => {
            if (n.id !== noteId) return n
            const overrides = { ...n.overrides }
            if (access) overrides[userId] = access
            else delete overrides[userId]
            return { ...n, overrides }
          }),
        }),
      ),
    [write, ws],
  )

  // ---- docs (any member on a qualifying plan uploads; admin or uploader removes) ----
  const uploadDoc = useCallback(
    async (file: File): Promise<string | null> => {
      if (file.size > 20 * 1024 * 1024) return 'Files are limited to 20 MB.'
      setError(null)
      if (!supabase) {
        // Demo mode keeps a record but not the bytes.
        commitLocal({ ...ws, docs: [{ id: newWorkspaceId(), name: file.name, path: '', size: file.size, mime: file.type, createdAt: now(), mine: true }, ...ws.docs] })
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

  return {
    ...ws,
    loading,
    error,
    reload,
    createList,
    renameList,
    saveListItems,
    deleteList,
    setListDefault,
    setListMemberAccess,
    saveNote,
    deleteNote,
    setNoteDefault,
    setNoteMemberAccess,
    uploadDoc,
    deleteDoc,
    docUrl,
  }
}
