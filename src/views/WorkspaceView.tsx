import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  BookHeart, Bookmark as BookmarkIcon, Check, ExternalLink, Feather, ListChecks,
  GanttChartSquare, Lock, Plus, Share2, StickyNote, Trash2, Users2, X,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { usePlan } from '../lib/usePlan'
import { UpgradeGate } from '../components/UpgradeGate'
import { SegmentBar, useSegment } from '../components/SegmentBar'
import { PlannerView } from './PlannerView'
import {
  LIST_COLORS, MOODS, PIECE_TYPES, FREE_LIMITS,
  nativeShare, shareTargets, useBookmarks, useCreative, useDiary, useLists, useNotes,
  type PieceType,
} from '../lib/useWorkspace'

const SEGMENT_KEYS = ['lists', 'notes', 'bookmarks', 'diary', 'creative', 'plans'] as const
type Segment = (typeof SEGMENT_KEYS)[number]

const SEGMENTS: { key: Segment; label: string; icon: typeof ListChecks; premium?: boolean }[] = [
  { key: 'lists', label: 'Lists', icon: ListChecks },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'bookmarks', label: 'Bookmarks', icon: BookmarkIcon },
  { key: 'diary', label: 'Diary', icon: BookHeart, premium: true },
  { key: 'creative', label: 'Creative', icon: Feather, premium: true },
  { key: 'plans', label: 'Plans', icon: GanttChartSquare, premium: true },
]

const field =
  'w-full rounded-[12px] border border-[color:var(--border-strong)] bg-white/[0.08] px-3.5 py-2.5 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] md:text-[0.85rem]'
const primaryBtn =
  'cursor-pointer rounded-full bg-[color:var(--accent)] px-4 py-2.5 text-[0.8rem] font-bold text-white transition hover:brightness-110'
const ghostBtn =
  'cursor-pointer rounded-full border border-[color:var(--border-strong)] bg-white/[0.08] px-4 py-2.5 text-[0.8rem] font-semibold text-[color:var(--ink-dim)] transition hover:text-white'

function UsageBar({ used, cap, label }: { used: number; cap: number; label: string }) {
  const isPremium = usePlan().can('unlimited_workspace')
  if (isPremium) {
    return (
      <span className="rounded-full bg-[color:var(--accent)] px-2.5 py-1 text-[0.62rem] font-bold text-white">
        Unlimited
      </span>
    )
  }
  const pct = Math.min(100, (used / cap) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.14]">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--cyan),var(--violet))]" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[0.68rem] text-[color:var(--ink-faint)]">
        {used}/{cap} {label}
      </span>
    </div>
  )
}

function LimitNotice({ what }: { what: string }) {
  return (
    <UpgradeGate
      feature="unlimited_workspace"
      title={`You've reached the free limit for ${what}`}
      description={`Personal Plus removes the cap on ${what} and lets you share them with friends and groups.`}
    />
  )
}


function ShareRow({ title, text }: { title: string; text: string }) {
  const [state, setState] = useState<string | null>(null)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={async () => {
          const r = await nativeShare(title, text)
          setState(r === 'copied' ? 'Copied to clipboard' : r === 'shared' ? 'Shared' : 'Share unavailable')
          setTimeout(() => setState(null), 2200)
        }}
        className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[color:var(--card-border)] bg-white/[0.08] px-3 py-1.5 text-[0.72rem] font-semibold text-[color:var(--ink-dim)] transition hover:text-white"
      >
        <Share2 size={13} /> Share
      </button>
      {shareTargets(`${title} — ${text.slice(0, 120)}`).map(t => (
        <a
          key={t.name}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-[color:var(--card-border)] bg-white/[0.06] px-3 py-1.5 text-[0.72rem] font-semibold text-[color:var(--ink-faint)] transition hover:text-white"
        >
          {t.name}
        </a>
      ))}
      {state && <span className="text-[0.7rem] text-[color:var(--teal)]">{state}</span>}
    </div>
  )
}

// ===========================================================================
function ListsSection() {
  const { lists, atLimit, createList, deleteList, toggleShared, addItem, toggleItem, deleteItem } = useLists()
  const isPremium = usePlan().can('list_sharing')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(LIST_COLORS[0])
  const [itemText, setItemText] = useState<Record<string, string>>({})

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <UsageBar used={lists.length} cap={FREE_LIMITS.lists} label="lists" />
        <button onClick={() => setOpen(v => !v)} disabled={atLimit} className={cn(primaryBtn, 'flex items-center gap-1.5 disabled:opacity-50')}>
          <Plus size={15} /> New list
        </button>
      </div>

      {atLimit && <LimitNotice what="lists" />}

      <AnimatePresence>
        {open && !atLimit && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={e => {
              e.preventDefault()
              if (createList(name, color)) {
                setName('')
                setOpen(false)
              }
            }}
            className="card overflow-hidden"
          >
            <div className="flex flex-col gap-3 p-5">
              <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="List name" required className={field} />
              <div className="flex items-center gap-2">
                <span className="text-[0.75rem] text-[color:var(--ink-dim)]">Colour</span>
                {LIST_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Colour ${c}`}
                    className={cn('h-6 w-6 cursor-pointer rounded-full transition', color === c && 'ring-2 ring-white')} style={{ background: c }} />
                ))}
              </div>
              <div className="flex gap-2">
                <button type="submit" className={cn(primaryBtn, 'flex-1')}>Create list</button>
                <button type="button" onClick={() => setOpen(false)} className={ghostBtn}>Cancel</button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {lists.length === 0 && !atLimit && (
        <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="text-3xl">🗒️</span>
          <h3 className="font-display text-[0.95rem] font-bold">No lists yet</h3>
          <p className="max-w-xs text-[0.8rem] text-[color:var(--ink-dim)]">Create a list for groceries, packing, or anything you tick off.</p>
        </div>
      )}

      {lists.map(l => {
        const doneCount = l.items.filter(i => i.done).length
        return (
          <div key={l.id} className="card flex flex-col gap-3 p-5">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: l.color }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.92rem] font-bold">{l.name}</div>
                <div className="text-[0.72rem] text-[color:var(--ink-faint)]">
                  {doneCount}/{l.items.length} done{l.shared ? ' · shared' : ''}
                </div>
              </div>
              <button
                onClick={() => (isPremium ? toggleShared(l.id) : undefined)}
                disabled={!isPremium}
                title={isPremium ? 'Toggle sharing' : 'Sharing lists is a Premium feature'}
                className={cn(
                  'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[color:var(--border-strong)] px-3 py-1.5 text-[0.7rem] font-semibold transition',
                  l.shared ? 'bg-[rgba(45,212,191,0.18)] text-[#7BE9D8]' : 'bg-white/[0.06] text-[color:var(--ink-faint)]',
                  !isPremium && 'cursor-not-allowed opacity-60',
                )}
              >
                {isPremium ? <Users2 size={13} /> : <Lock size={12} />} {l.shared ? 'Shared' : 'Share'}
              </button>
              <button onClick={() => deleteList(l.id)} aria-label={`Delete ${l.name}`} className="shrink-0 cursor-pointer text-[color:var(--ink-faint)] transition hover:text-[color:var(--red)]">
                <Trash2 size={15} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {l.items.map(i => (
                <div key={i.id} className="group flex items-center gap-2.5">
                  <button
                    onClick={() => toggleItem(l.id, i.id)}
                    aria-label={i.done ? `Mark ${i.text} not done` : `Mark ${i.text} done`}
                    className={cn(
                      'flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border transition',
                      i.done ? 'border-transparent bg-[color:var(--teal)] text-[#0c2b26]' : 'border-[color:var(--border-strong)] bg-white/[0.06]',
                    )}
                  >
                    {i.done && <Check size={12} strokeWidth={3} />}
                  </button>
                  <span className={cn('flex-1 text-[0.85rem]', i.done && 'text-[color:var(--ink-faint)] line-through')}>{i.text}</span>
                  <button onClick={() => deleteItem(l.id, i.id)} aria-label={`Remove ${i.text}`} className="shrink-0 cursor-pointer text-[color:var(--ink-faint)] opacity-0 transition hover:text-[color:var(--red)] group-hover:opacity-100">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <form
              onSubmit={e => {
                e.preventDefault()
                addItem(l.id, itemText[l.id] ?? '')
                setItemText(s => ({ ...s, [l.id]: '' }))
              }}
              className="flex gap-2"
            >
              <input
                value={itemText[l.id] ?? ''}
                onChange={e => setItemText(s => ({ ...s, [l.id]: e.target.value }))}
                placeholder="Add an item…"
                aria-label={`Add item to ${l.name}`}
                className={cn(field, 'rounded-full py-2')}
              />
              <button type="submit" aria-label="Add item" className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/[0.12] text-white transition hover:bg-white/[0.2]">
                <Plus size={16} />
              </button>
            </form>
          </div>
        )
      })}
    </div>
  )
}

// ===========================================================================
function NotesSection() {
  const { notes, atLimit, createNote, deleteNote, shareNote } = useNotes()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [shareWith, setShareWith] = useState<Record<string, string>>({})

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <UsageBar used={notes.length} cap={FREE_LIMITS.notes} label="notes" />
        <button onClick={() => setOpen(v => !v)} disabled={atLimit} className={cn(primaryBtn, 'flex items-center gap-1.5 disabled:opacity-50')}>
          <Plus size={15} /> New note
        </button>
      </div>

      {atLimit && <LimitNotice what="notes" />}

      <AnimatePresence>
        {open && !atLimit && (
          <motion.form
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={e => {
              e.preventDefault()
              if (createNote(title, body)) {
                setTitle(''); setBody(''); setOpen(false)
              }
            }}
            className="card overflow-hidden"
          >
            <div className="flex flex-col gap-3 p-5">
              <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title" className={field} />
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Write your note…" className={cn(field, 'resize-none')} />
              <div className="flex gap-2">
                <button type="submit" className={cn(primaryBtn, 'flex-1')}>Save note</button>
                <button type="button" onClick={() => setOpen(false)} className={ghostBtn}>Cancel</button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {notes.map(n => (
        <div key={n.id} className="card flex flex-col gap-3 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-white/10 text-base">📝</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.92rem] font-bold">{n.title}</div>
              <p className="mt-1 whitespace-pre-wrap text-[0.82rem] leading-relaxed text-[color:var(--ink-dim)]">{n.body}</p>
              {n.sharedWith.length > 0 && (
                <div className="mt-2 text-[0.7rem] text-[color:var(--ink-faint)]">Shared with {n.sharedWith.join(', ')}</div>
              )}
            </div>
            <button onClick={() => deleteNote(n.id)} aria-label={`Delete ${n.title}`} className="shrink-0 cursor-pointer text-[color:var(--ink-faint)] transition hover:text-[color:var(--red)]">
              <Trash2 size={15} />
            </button>
          </div>
          <form
            onSubmit={e => {
              e.preventDefault()
              shareNote(n.id, shareWith[n.id] ?? '')
              setShareWith(s => ({ ...s, [n.id]: '' }))
            }}
            className="flex gap-2 border-t border-white/10 pt-3"
          >
            <input
              value={shareWith[n.id] ?? ''}
              onChange={e => setShareWith(s => ({ ...s, [n.id]: e.target.value }))}
              placeholder="Share with a friend (email)…"
              aria-label={`Share ${n.title}`}
              className={cn(field, 'rounded-full py-2')}
            />
            <button type="submit" className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-white/[0.12] px-3.5 py-2 text-[0.75rem] font-bold text-white transition hover:bg-white/[0.2]">
              <Share2 size={13} /> Share
            </button>
          </form>
        </div>
      ))}
    </div>
  )
}

// ===========================================================================
function BookmarksSection() {
  const { bookmarks, atLimit, createBookmark, deleteBookmark } = useBookmarks()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [tag, setTag] = useState('')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <UsageBar used={bookmarks.length} cap={FREE_LIMITS.bookmarks} label="links" />
        <button onClick={() => setOpen(v => !v)} disabled={atLimit} className={cn(primaryBtn, 'flex items-center gap-1.5 disabled:opacity-50')}>
          <Plus size={15} /> Add link
        </button>
      </div>

      {atLimit && <LimitNotice what="bookmarks" />}

      <AnimatePresence>
        {open && !atLimit && (
          <motion.form
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={e => {
              e.preventDefault()
              if (createBookmark(title, url, tag)) {
                setTitle(''); setUrl(''); setTag(''); setOpen(false)
              }
            }}
            className="card overflow-hidden"
          >
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className={field} />
              <input value={tag} onChange={e => setTag(e.target.value)} placeholder="Tag (e.g. Work)" className={field} />
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" required className={cn(field, 'sm:col-span-2')} />
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" className={cn(primaryBtn, 'flex-1')}>Save link</button>
                <button type="button" onClick={() => setOpen(false)} className={ghostBtn}>Cancel</button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {bookmarks.map(b => (
        <div key={b.id} className="card group flex items-center gap-3.5 px-[18px] py-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-base">🔖</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-[0.9rem] font-bold">{b.title}</span>
              <span className="rounded-full bg-white/[0.12] px-2 py-[2px] text-[0.6rem] font-bold text-[color:var(--ink-dim)]">{b.tag}</span>
            </div>
            <a href={b.url} target="_blank" rel="noopener noreferrer" className="block truncate text-[0.74rem] text-[color:var(--ink-faint)] transition hover:text-[color:var(--accent)]">
              {b.url}
            </a>
          </div>
          <a href={b.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${b.title}`} className="shrink-0 text-[color:var(--ink-faint)] transition hover:text-white">
            <ExternalLink size={15} />
          </a>
          <button onClick={() => deleteBookmark(b.id)} aria-label={`Delete ${b.title}`} className="shrink-0 cursor-pointer text-[color:var(--ink-faint)] opacity-0 transition hover:text-[color:var(--red)] group-hover:opacity-100">
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ===========================================================================
function DiarySection() {
  const isPremium = usePlan().can('diary')
  const { entries, createEntry, deleteEntry } = useDiary()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [mood, setMood] = useState(MOODS[1])
  const [body, setBody] = useState('')

  if (!isPremium) {
    return <UpgradeGate feature="diary" title="Your private diary" description="Keep a daily journal with mood tracking, private to your account." />
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={e => {
          e.preventDefault()
          createEntry(date, mood, body)
          setBody('')
        }}
        className="card flex flex-col gap-3 p-5"
      >
        <div className="flex flex-wrap items-center gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={cn(field, 'w-auto')} aria-label="Entry date" />
          <div className="flex flex-wrap gap-1">
            {MOODS.map(m => (
              <button key={m} type="button" onClick={() => setMood(m)} aria-label={`Mood ${m}`}
                className={cn('h-9 w-9 cursor-pointer rounded-full text-lg transition', mood === m ? 'bg-[color:var(--surface-2)] ring-1 ring-white/40' : 'hover:bg-white/[0.08]')}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="How was your day?" className={cn(field, 'resize-none')} />
        <button type="submit" className={cn(primaryBtn, 'self-start')}>Save entry</button>
      </form>

      {entries.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="text-3xl">📔</span>
          <h3 className="font-display text-[0.95rem] font-bold">Your diary is empty</h3>
          <p className="max-w-xs text-[0.8rem] text-[color:var(--ink-dim)]">Write your first entry above — only you can see it.</p>
        </div>
      ) : (
        entries.map(e => (
          <div key={e.id} className="card flex items-start gap-3.5 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl">{e.mood}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[0.78rem] font-bold text-[color:var(--ink-dim)]">
                {new Intl.DateTimeFormat('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(e.date + 'T00:00:00'))}
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[0.85rem] leading-relaxed">{e.body}</p>
            </div>
            <button onClick={() => deleteEntry(e.id)} aria-label="Delete entry" className="shrink-0 cursor-pointer text-[color:var(--ink-faint)] transition hover:text-[color:var(--red)]">
              <Trash2 size={15} />
            </button>
          </div>
        ))
      )}
    </div>
  )
}

// ===========================================================================
function CreativeSection() {
  const isPremium = usePlan().can('diary')
  const { pieces, createPiece, deletePiece } = useCreative()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<PieceType>('story')
  const [body, setBody] = useState('')

  if (!isPremium) {
    return <UpgradeGate feature="diary" title="Stories, poems & creative writing" description="Write and keep your creative pieces, then share them to X, Facebook, LinkedIn or WhatsApp." />
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={e => {
          e.preventDefault()
          createPiece(title, type, body)
          setTitle(''); setBody('')
        }}
        className="card flex flex-col gap-3 p-5"
      >
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className={field} />
        <div className="flex gap-1.5">
          {PIECE_TYPES.map(t => (
            <button key={t.value} type="button" onClick={() => setType(t.value)}
              className={cn('cursor-pointer rounded-full px-3.5 py-1.5 text-[0.75rem] font-semibold transition',
                type === t.value ? 'bg-[color:var(--surface-2)] text-white' : 'text-[color:var(--ink-faint)] hover:text-[color:var(--ink-dim)]')}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} placeholder="Once upon a time…" className={cn(field, 'resize-none')} />
        <button type="submit" className={cn(primaryBtn, 'self-start')}>Save piece</button>
      </form>

      {pieces.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="text-3xl">✒️</span>
          <h3 className="font-display text-[0.95rem] font-bold">Nothing written yet</h3>
          <p className="max-w-xs text-[0.8rem] text-[color:var(--ink-dim)]">Write a story or poem above, then share it with the world.</p>
        </div>
      ) : (
        pieces.map(p => {
          const meta = PIECE_TYPES.find(t => t.value === p.type)
          return (
            <div key={p.id} className="card flex flex-col gap-3 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-lg">{meta?.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[0.95rem] font-bold">{p.title}</span>
                    <span className="rounded-full bg-white/[0.12] px-2 py-[2px] text-[0.6rem] font-bold text-[color:var(--ink-dim)]">{meta?.label}</span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-[0.85rem] leading-relaxed text-[color:var(--ink-dim)]">{p.body}</p>
                </div>
                <button onClick={() => deletePiece(p.id)} aria-label={`Delete ${p.title}`} className="shrink-0 cursor-pointer text-[color:var(--ink-faint)] transition hover:text-[color:var(--red)]">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="border-t border-white/10 pt-3">
                <ShareRow title={p.title} text={p.body} />
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ===========================================================================
const SYNC_LABEL: Record<string, { text: string; cls: string }> = {
  local: { text: 'Saved on this device', cls: 'text-[color:var(--ink-faint)]' },
  loading: { text: 'Loading your workspace…', cls: 'text-[color:var(--ink-faint)]' },
  saving: { text: 'Saving…', cls: 'text-[color:var(--ink-dim)]' },
  synced: { text: 'Synced to your account', cls: 'text-[#7BE9D8]' },
  error: { text: "Couldn't sync — saved on this device", cls: 'text-[#FCD770]' },
}

export function WorkspaceView() {
  const [segment, setSegment] = useSegment(SEGMENT_KEYS, 'lists')
  const { can } = usePlan()
  const { syncState, syncError } = useLists()
  const sync = SYNC_LABEL[syncState] ?? SYNC_LABEL.local

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[1.05rem] font-bold">Workspace</h2>
          <p className="text-[0.78rem] text-[color:var(--ink-dim)]">Lists, notes, bookmarks, diary, creative writing and plans.</p>
          <p className={cn('mt-1 text-[0.68rem]', sync.cls)}>
            {sync.text}
            {syncState === 'error' && syncError && (
              <span className="block text-[color:var(--ink-faint)]">{syncError}</span>
            )}
          </p>
        </div>
      </div>

      <SegmentBar
        label="Workspace sections"
        value={segment}
        onChange={setSegment}
        segments={SEGMENTS.map(s => ({ key: s.key, label: s.label, icon: s.icon, locked: s.key === 'plans' ? !can('planner') : s.premium ? !can('diary') : false }))}
      />

      <AnimatePresence mode="wait">
        <motion.div key={segment} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
          {segment === 'lists' && <ListsSection />}
          {segment === 'notes' && <NotesSection />}
          {segment === 'bookmarks' && <BookmarksSection />}
          {segment === 'diary' && <DiarySection />}
          {segment === 'creative' && <CreativeSection />}
          {segment === 'plans' && <PlannerView />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
