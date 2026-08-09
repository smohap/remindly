import { useCallback, useSyncExternalStore } from 'react'
import { makeStore } from './localStore'
import { makeSyncedStore, useSyncState } from './syncedStore'

// ---------------------------------------------------------------------------
// Premium status. No billing is wired yet, so this is a local preview switch
// that lets free-tier limits and premium-only features be exercised.
// ---------------------------------------------------------------------------
const premiumStore = makeStore<boolean>('remindly.premium.v1', false)

export function usePremium() {
  const isPremium = useSyncExternalStore(premiumStore.subscribe, premiumStore.get, premiumStore.get)
  const setPremium = useCallback((v: boolean) => premiumStore.set(v), [])
  return { isPremium, setPremium }
}

// Free-tier caps
export const FREE_LIMITS = { lists: 5, notes: 10, bookmarks: 50 } as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ListItem {
  id: string
  text: string
  done: boolean
}

export interface UserList {
  id: string
  name: string
  color: string
  shared: boolean
  items: ListItem[]
  createdAt: string
}

export interface Note {
  id: string
  title: string
  body: string
  updatedAt: string
  sharedWith: string[]
}

export interface Bookmark {
  id: string
  title: string
  url: string
  tag: string
  createdAt: string
}

export interface DiaryEntry {
  id: string
  date: string // YYYY-MM-DD
  mood: string
  body: string
  updatedAt: string
}

export type PieceType = 'story' | 'poem' | 'other'

export interface CreativePiece {
  id: string
  title: string
  type: PieceType
  body: string
  updatedAt: string
}

export const LIST_COLORS = ['#7C6FFF', '#FF6FB0', '#4FD1FF', '#2DD4BF', '#FBBF24', '#FF6B6B']
export const MOODS = ['😀', '🙂', '😐', '😕', '😔', '😤', '🥳', '😴']
export const PIECE_TYPES: { value: PieceType; label: string; icon: string }[] = [
  { value: 'story', label: 'Story', icon: '📖' },
  { value: 'poem', label: 'Poem', icon: '✒️' },
  { value: 'other', label: 'Other', icon: '✨' },
]

const now = () => new Date().toISOString()
const today = () => new Date().toISOString().slice(0, 10)

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------
const listsStore = makeSyncedStore<UserList>({
  key: 'remindly.lists.v1',
  table: 'lists',
  orderBy: { column: 'created_at' },
  toRow: l => ({ name: l.name, color: l.color, shared: l.shared, items: l.items, created_at: l.createdAt }),
  fromRow: r => ({
    id: String(r.id),
    name: String(r.name ?? ''),
    color: String(r.color ?? '#7C6FFF'),
    shared: Boolean(r.shared),
    items: Array.isArray(r.items) ? (r.items as ListItem[]) : [],
    createdAt: String(r.created_at ?? new Date().toISOString()),
  }),
  seed: [
  {
    id: 'l1',
    name: 'Groceries',
    color: '#2DD4BF',
    shared: false,
    createdAt: now(),
    items: [
      { id: 'li1', text: 'Milk', done: false },
      { id: 'li2', text: 'Sourdough', done: true },
      { id: 'li3', text: 'Coffee beans', done: false },
    ],
  },
  {
    id: 'l2',
    name: 'Trip packing',
    color: '#7C6FFF',
    shared: false,
    createdAt: now(),
    items: [{ id: 'li4', text: 'Passport', done: false }],
  },
  ],
})

export function useLists() {
  const lists = useSyncExternalStore(listsStore.subscribe, listsStore.get, listsStore.get)
  const syncState = useSyncState(listsStore)
  const syncError = listsStore.getError()
  const { isPremium } = usePremium()
  const atLimit = !isPremium && lists.length >= FREE_LIMITS.lists

  const createList = useCallback(
    (name: string, color: string) => {
      const trimmed = name.trim()
      if (!trimmed) return false
      const cur = listsStore.get()
      if (!premiumStore.get() && cur.length >= FREE_LIMITS.lists) return false
      listsStore.set([{ id: `l-${Date.now()}`, name: trimmed, color, shared: false, items: [], createdAt: now() }, ...cur])
      return true
    },
    [],
  )
  const renameList = useCallback((id: string, name: string) => {
    listsStore.set(listsStore.get().map(l => (l.id === id ? { ...l, name } : l)))
  }, [])
  const deleteList = useCallback((id: string) => {
    listsStore.set(listsStore.get().filter(l => l.id !== id))
  }, [])
  const toggleShared = useCallback((id: string) => {
    listsStore.set(listsStore.get().map(l => (l.id === id ? { ...l, shared: !l.shared } : l)))
  }, [])
  const addItem = useCallback((listId: string, text: string) => {
    const t = text.trim()
    if (!t) return
    listsStore.set(
      listsStore.get().map(l => (l.id === listId ? { ...l, items: [...l.items, { id: `li-${Date.now()}`, text: t, done: false }] } : l)),
    )
  }, [])
  const toggleItem = useCallback((listId: string, itemId: string) => {
    listsStore.set(
      listsStore
        .get()
        .map(l => (l.id === listId ? { ...l, items: l.items.map(i => (i.id === itemId ? { ...i, done: !i.done } : i)) } : l)),
    )
  }, [])
  const deleteItem = useCallback((listId: string, itemId: string) => {
    listsStore.set(listsStore.get().map(l => (l.id === listId ? { ...l, items: l.items.filter(i => i.id !== itemId) } : l)))
  }, [])

  return { lists, atLimit, syncState, syncError, createList, renameList, deleteList, toggleShared, addItem, toggleItem, deleteItem }
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------
const notesStore = makeSyncedStore<Note>({
  key: 'remindly.notes.v1',
  table: 'notes',
  orderBy: { column: 'updated_at' },
  toRow: n => ({ title: n.title, body: n.body, updated_at: n.updatedAt }),
  fromRow: r => ({
    id: String(r.id),
    title: String(r.title ?? 'Untitled note'),
    body: String(r.body ?? ''),
    updatedAt: String(r.updated_at ?? new Date().toISOString()),
    sharedWith: [], // note_shares rows are loaded separately; not synced here yet
  }),
  seed: [
    { id: 'n1', title: 'Site A induction notes', body: 'Gate code 4417. Ask for Tama on arrival.', updatedAt: now(), sharedWith: [] },
  ],
})

export function useNotes() {
  const notes = useSyncExternalStore(notesStore.subscribe, notesStore.get, notesStore.get)
  const { isPremium } = usePremium()
  const atLimit = !isPremium && notes.length >= FREE_LIMITS.notes

  const createNote = useCallback((title: string, body: string) => {
    const cur = notesStore.get()
    if (!premiumStore.get() && cur.length >= FREE_LIMITS.notes) return false
    if (!title.trim() && !body.trim()) return false
    notesStore.set([{ id: `n-${Date.now()}`, title: title.trim() || 'Untitled note', body, updatedAt: now(), sharedWith: [] }, ...cur])
    return true
  }, [])
  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    notesStore.set(notesStore.get().map(n => (n.id === id ? { ...n, ...patch, updatedAt: now() } : n)))
  }, [])
  const deleteNote = useCallback((id: string) => {
    notesStore.set(notesStore.get().filter(n => n.id !== id))
  }, [])
  const shareNote = useCallback((id: string, who: string) => {
    const w = who.trim()
    if (!w) return
    notesStore.set(notesStore.get().map(n => (n.id === id ? { ...n, sharedWith: [...new Set([...n.sharedWith, w])] } : n)))
  }, [])

  return { notes, atLimit, createNote, updateNote, deleteNote, shareNote }
}

// ---------------------------------------------------------------------------
// Bookmarks
// ---------------------------------------------------------------------------
const bookmarksStore = makeSyncedStore<Bookmark>({
  key: 'remindly.bookmarks.v1',
  table: 'bookmarks',
  orderBy: { column: 'created_at' },
  toRow: b => ({ title: b.title, url: b.url, tag: b.tag, created_at: b.createdAt }),
  fromRow: r => ({
    id: String(r.id),
    title: String(r.title ?? ''),
    url: String(r.url ?? ''),
    tag: String(r.tag ?? 'General'),
    createdAt: String(r.created_at ?? new Date().toISOString()),
  }),
  seed: [
    { id: 'b1', title: 'IRD — GST filing dates', url: 'https://www.ird.govt.nz', tag: 'Work', createdAt: now() },
    { id: 'b2', title: 'NZTA — rego renewal', url: 'https://www.nzta.govt.nz', tag: 'Vehicle', createdAt: now() },
  ],
})

export function useBookmarks() {
  const bookmarks = useSyncExternalStore(bookmarksStore.subscribe, bookmarksStore.get, bookmarksStore.get)
  const { isPremium } = usePremium()
  const atLimit = !isPremium && bookmarks.length >= FREE_LIMITS.bookmarks

  const createBookmark = useCallback((title: string, url: string, tag: string) => {
    const cur = bookmarksStore.get()
    if (!premiumStore.get() && cur.length >= FREE_LIMITS.bookmarks) return false
    if (!url.trim()) return false
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
    bookmarksStore.set([{ id: `b-${Date.now()}`, title: title.trim() || href, url: href, tag: tag.trim() || 'General', createdAt: now() }, ...cur])
    return true
  }, [])
  const updateBookmark = useCallback((id: string, patch: Partial<Bookmark>) => {
    bookmarksStore.set(bookmarksStore.get().map(b => (b.id === id ? { ...b, ...patch } : b)))
  }, [])
  const deleteBookmark = useCallback((id: string) => {
    bookmarksStore.set(bookmarksStore.get().filter(b => b.id !== id))
  }, [])

  return { bookmarks, atLimit, createBookmark, updateBookmark, deleteBookmark }
}

// ---------------------------------------------------------------------------
// Diary (premium)
// ---------------------------------------------------------------------------
const diaryStore = makeSyncedStore<DiaryEntry>({
  key: 'remindly.diary.v1',
  table: 'diary_entries',
  orderBy: { column: 'entry_date' },
  toRow: e => ({ entry_date: e.date, mood: e.mood, body: e.body, updated_at: e.updatedAt }),
  fromRow: r => ({
    id: String(r.id),
    date: String(r.entry_date ?? new Date().toISOString().slice(0, 10)),
    mood: String(r.mood ?? '🙂'),
    body: String(r.body ?? ''),
    updatedAt: String(r.updated_at ?? new Date().toISOString()),
  }),
  seed: [],
})

export function useDiary() {
  const entries = useSyncExternalStore(diaryStore.subscribe, diaryStore.get, diaryStore.get)
  const createEntry = useCallback((date: string, mood: string, body: string) => {
    if (!body.trim()) return
    diaryStore.set([{ id: `d-${Date.now()}`, date: date || today(), mood, body, updatedAt: now() }, ...diaryStore.get()])
  }, [])
  const updateEntry = useCallback((id: string, patch: Partial<DiaryEntry>) => {
    diaryStore.set(diaryStore.get().map(e => (e.id === id ? { ...e, ...patch, updatedAt: now() } : e)))
  }, [])
  const deleteEntry = useCallback((id: string) => {
    diaryStore.set(diaryStore.get().filter(e => e.id !== id))
  }, [])
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
  return { entries: sorted, createEntry, updateEntry, deleteEntry }
}

// ---------------------------------------------------------------------------
// Creative writing (premium)
// ---------------------------------------------------------------------------
const creativeStore = makeSyncedStore<CreativePiece>({
  key: 'remindly.creative.v1',
  table: 'creative_pieces',
  orderBy: { column: 'updated_at' },
  toRow: p => ({ title: p.title, piece_type: p.type, body: p.body, updated_at: p.updatedAt }),
  fromRow: r => ({
    id: String(r.id),
    title: String(r.title ?? 'Untitled'),
    type: (r.piece_type as PieceType) ?? 'story',
    body: String(r.body ?? ''),
    updatedAt: String(r.updated_at ?? new Date().toISOString()),
  }),
  seed: [],
})

/** Hydrate every workspace collection for a signed-in user. */
export async function hydrateWorkspace(uid: string) {
  await Promise.all([
    listsStore.hydrate(uid),
    notesStore.hydrate(uid),
    bookmarksStore.hydrate(uid),
    diaryStore.hydrate(uid),
    creativeStore.hydrate(uid),
  ])
}

export function useCreative() {
  const pieces = useSyncExternalStore(creativeStore.subscribe, creativeStore.get, creativeStore.get)
  const createPiece = useCallback((title: string, type: PieceType, body: string) => {
    if (!body.trim()) return
    creativeStore.set([{ id: `c-${Date.now()}`, title: title.trim() || 'Untitled', type, body, updatedAt: now() }, ...creativeStore.get()])
  }, [])
  const updatePiece = useCallback((id: string, patch: Partial<CreativePiece>) => {
    creativeStore.set(creativeStore.get().map(p => (p.id === id ? { ...p, ...patch, updatedAt: now() } : p)))
  }, [])
  const deletePiece = useCallback((id: string) => {
    creativeStore.set(creativeStore.get().filter(p => p.id !== id))
  }, [])
  return { pieces, createPiece, updatePiece, deletePiece }
}

// ---------------------------------------------------------------------------
// Sharing helpers
// ---------------------------------------------------------------------------
export function shareTargets(text: string, url = 'https://remindly-plum.vercel.app') {
  const t = encodeURIComponent(text)
  const u = encodeURIComponent(url)
  return [
    { name: 'X', href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}` },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { name: 'WhatsApp', href: `https://wa.me/?text=${t}%20${u}` },
  ]
}

export async function nativeShare(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ title, text })
      return 'shared'
    }
    await navigator.clipboard.writeText(`${title}\n\n${text}`)
    return 'copied'
  } catch {
    return 'failed'
  }
}
