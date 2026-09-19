import { useRef, useState } from 'react'
import { Check, Download, FileText, ListChecks, Pencil, Plus, StickyNote, Trash2, Upload, X } from 'lucide-react'
import { cn } from '../lib/cn'
import { usePlan } from '../lib/usePlan'
import type { WorkspaceAccess } from '../lib/useGroups'
import { formatBytes, useGroupWorkspace, newWorkspaceId, type GroupDoc, type GroupNote } from '../lib/useGroupWorkspace'
import { SegmentBar } from './SegmentBar'
import { UpgradeGate } from './UpgradeGate'

type Seg = 'lists' | 'notes' | 'docs'

/**
 * Shared lists, notes and documents for one group.
 *
 * - `isAdmin`: group admins create, rename and delete lists, delete notes,
 *   and decide every member's `access`.
 * - `access`: what the viewer may do — `none` (nothing shown), `read`, or
 *   `write` (tick / add items, write notes, upload docs).
 * - Docs additionally need Personal Plus or a business plan.
 * RLS (0014) is the real gate; this only shapes the UI.
 */
export function GroupWorkspace({ groupId, isAdmin, access }: { groupId: string; isAdmin: boolean; access: WorkspaceAccess }) {
  const ws = useGroupWorkspace(groupId)
  const { can } = usePlan()
  const [seg, setSeg] = useState<Seg>('lists')
  if (access === 'none' && !isAdmin) {
    return <p className="text-[0.76rem] text-[color:var(--ink-faint)]">A group admin hasn't given you access to this group's lists and notes yet.</p>
  }
  const canWrite = isAdmin || access === 'write'
  return (
    <div className="flex flex-col gap-3">
      <SegmentBar
        label="Group workspace"
        value={seg}
        onChange={setSeg}
        segments={[
          { key: 'lists', label: 'Lists', icon: ListChecks, badge: ws.lists.length },
          { key: 'notes', label: 'Notes', icon: StickyNote, badge: ws.notes.length },
          { key: 'docs', label: 'Docs', icon: FileText, badge: ws.docs.length },
        ]}
      />
      {ws.error && <p className="text-[0.76rem] text-[color:var(--danger)]">{ws.error}</p>}
      {ws.loading && <p className="text-[0.76rem] text-[color:var(--ink-faint)]">Loading…</p>}
      {seg === 'lists' && <Lists ws={ws} isAdmin={isAdmin} canWrite={canWrite} />}
      {seg === 'notes' && <Notes ws={ws} isAdmin={isAdmin} canWrite={canWrite} />}
      {seg === 'docs' &&
        (can('group_docs') ? (
          <Docs ws={ws} canWrite={canWrite} />
        ) : (
          <UpgradeGate feature="group_docs" description="Upload and share documents (up to 20 MB each) with this group. Included in Personal Plus and all business plans." />
        ))}
      {!canWrite && <p className="text-[0.7rem] text-[color:var(--ink-faint)]">View only — a group admin can give you write access.</p>}
    </div>
  )
}

type WS = ReturnType<typeof useGroupWorkspace>

function Lists({ ws, isAdmin, canWrite }: { ws: WS; isAdmin: boolean; canWrite: boolean }) {
  const [name, setName] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  return (
    <div className="flex flex-col gap-2">
      {isAdmin && (
        <form
          onSubmit={e => {
            e.preventDefault()
            void ws.createList(name)
            setName('')
          }}
          className="flex gap-2"
        >
          <input value={name} onChange={e => setName(e.target.value)} placeholder="New list, e.g. Match-day kit" className="field flex-1" />
          <button type="submit" className="btn-primary shrink-0"><Plus size={14} /> List</button>
        </form>
      )}
      {ws.lists.length === 0 && !ws.loading && <p className="text-[0.76rem] text-[color:var(--ink-faint)]">No shared lists yet.</p>}
      {ws.lists.map(l => {
        const done = l.items.filter(i => i.done).length
        return (
          <div key={l.id} className="card-2 flex flex-col gap-2 p-3">
            {renaming?.id === l.id ? (
              <form
                onSubmit={e => {
                  e.preventDefault()
                  void ws.renameList(l.id, renaming.name)
                  setRenaming(null)
                }}
                className="flex gap-2"
              >
                <input autoFocus value={renaming.name} onChange={e => setRenaming({ id: l.id, name: e.target.value })} aria-label="List name" className="field flex-1 py-1.5 text-[0.82rem]" />
                <button type="submit" className="btn-primary shrink-0 px-2.5 py-1.5"><Check size={13} /></button>
                <button type="button" onClick={() => setRenaming(null)} className="btn-ghost shrink-0 px-2.5 py-1.5"><X size={13} /></button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[0.84rem] font-semibold">{l.name}</span>
                <span className="text-[0.68rem] text-[color:var(--ink-faint)]">{done}/{l.items.length} done</span>
                {isAdmin && (
                  <>
                    <button onClick={() => setRenaming({ id: l.id, name: l.name })} aria-label={`Rename list ${l.name}`} title="Rename" className="text-[color:var(--ink-faint)] hover:text-[color:var(--ink)]"><Pencil size={13} /></button>
                    <button onClick={() => void ws.deleteList(l.id)} aria-label={`Delete list ${l.name}`} title="Delete" className="text-[color:var(--ink-faint)] hover:text-[color:var(--danger)]"><Trash2 size={13} /></button>
                  </>
                )}
              </div>
            )}
            {l.items.map(it => (
              <label key={it.id} className={cn('flex items-center gap-2 text-[0.8rem]', it.done && 'text-[color:var(--ink-faint)] line-through')}>
                <input type="checkbox" checked={it.done} disabled={!canWrite} onChange={e => void ws.saveListItems(l.id, l.items.map(x => (x.id === it.id ? { ...x, done: e.target.checked } : x)))} className="accent-[color:var(--accent)]" />
                <span className="flex-1">{it.text}</span>
                {canWrite && (
                  <button onClick={() => void ws.saveListItems(l.id, l.items.filter(x => x.id !== it.id))} aria-label={`Remove ${it.text}`} className="text-[color:var(--ink-faint)] hover:text-[color:var(--danger)]"><X size={12} /></button>
                )}
              </label>
            ))}
            {canWrite && (
              <form
                onSubmit={e => {
                  e.preventDefault()
                  const text = (drafts[l.id] ?? '').trim()
                  if (!text) return
                  void ws.saveListItems(l.id, [...l.items, { id: newWorkspaceId(), text, done: false }])
                  setDrafts(d => ({ ...d, [l.id]: '' }))
                }}
                className="flex gap-2"
              >
                <input value={drafts[l.id] ?? ''} onChange={e => setDrafts(d => ({ ...d, [l.id]: e.target.value }))} placeholder="Add an item…" className="field flex-1 py-1.5 text-[0.8rem]" />
                <button type="submit" className="btn-ghost shrink-0 px-2.5 py-1.5"><Plus size={13} /></button>
              </form>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Notes({ ws, isAdmin, canWrite }: { ws: WS; isAdmin: boolean; canWrite: boolean }) {
  const [editing, setEditing] = useState<GroupNote | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const open = (n?: GroupNote) => {
    setEditing(n ?? { id: '', title: '', body: '', updatedAt: '' })
    setTitle(n?.title ?? '')
    setBody(n?.body ?? '')
  }
  // Writers may name a new note; renaming an existing one is an admin job.
  const canRename = isAdmin || !editing?.id
  return (
    <div className="flex flex-col gap-2">
      {canWrite && !editing && (
        <button onClick={() => open()} className="btn-primary self-start"><Plus size={14} /> Note</button>
      )}
      {editing && (
        <form
          onSubmit={e => {
            e.preventDefault()
            void ws.saveNote({ id: editing.id || undefined, title, body })
            setEditing(null)
          }}
          className="card-2 flex flex-col gap-2 p-3"
        >
          <input autoFocus={canRename} value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" disabled={!canRename} title={canRename ? undefined : 'Only a group admin can rename a note'} className="field disabled:opacity-60" />
          <textarea autoFocus={!canRename} value={body} onChange={e => setBody(e.target.value)} placeholder="Write the note…" rows={5} className="field resize-y" />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary"><Check size={14} /> Save</button>
            <button type="button" onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}
      {ws.notes.length === 0 && !ws.loading && <p className="text-[0.76rem] text-[color:var(--ink-faint)]">No shared notes yet.</p>}
      {ws.notes.map(n => (
        <div key={n.id} className="card-2 flex flex-col gap-1 p-3">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[0.84rem] font-semibold">{n.title}</span>
            <span className="text-[0.66rem] text-[color:var(--ink-faint)]">{new Date(n.updatedAt).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}</span>
            {canWrite && <button onClick={() => open(n)} className="btn-ghost px-2 py-1 text-[0.7rem]">Edit</button>}
            {isAdmin && (
              <button onClick={() => void ws.deleteNote(n.id)} aria-label={`Delete note ${n.title}`} title="Delete" className="text-[color:var(--ink-faint)] hover:text-[color:var(--danger)]"><Trash2 size={13} /></button>
            )}
          </div>
          {n.body && <p className="whitespace-pre-wrap text-[0.8rem] leading-relaxed text-[color:var(--ink-dim)]">{n.body}</p>}
        </div>
      ))}
    </div>
  )
}

function Docs({ ws, canWrite }: { ws: WS; canWrite: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const openDoc = async (d: GroupDoc) => {
    const url = await ws.docUrl(d)
    if (url) window.open(url, '_blank', 'noopener')
    else setMsg('Downloads need a signed-in account.')
  }
  return (
    <div className="flex flex-col gap-2">
      {canWrite && (
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={async e => {
              const f = e.target.files?.[0]
              if (!f) return
              setBusy(true)
              const err = await ws.uploadDoc(f)
              setBusy(false)
              setMsg(err ?? `Uploaded ${f.name}`)
              e.target.value = ''
            }}
          />
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-primary"><Upload size={14} /> {busy ? 'Uploading…' : 'Upload document'}</button>
          <span className="text-[0.7rem] text-[color:var(--ink-faint)]">Up to 20 MB each.</span>
        </div>
      )}
      {msg && <p className="text-[0.74rem] text-[color:var(--ink-dim)]">{msg}</p>}
      {ws.docs.length === 0 && !ws.loading && <p className="text-[0.76rem] text-[color:var(--ink-faint)]">No documents yet.</p>}
      {ws.docs.map(d => (
        <div key={d.id} className="card-2 flex items-center gap-3 px-3 py-2">
          <FileText size={16} className="shrink-0 text-[color:var(--ink-dim)]" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[0.82rem] font-semibold">{d.name}</div>
            <div className="text-[0.66rem] text-[color:var(--ink-faint)]">{formatBytes(d.size)} · {new Date(d.createdAt).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}</div>
          </div>
          <button onClick={() => void openDoc(d)} aria-label={`Download ${d.name}`} className="btn-ghost px-2 py-1 text-[0.7rem]"><Download size={13} /></button>
          {canWrite && (
            <button onClick={() => void ws.deleteDoc(d)} aria-label={`Delete ${d.name}`} className="text-[color:var(--ink-faint)] hover:text-[color:var(--danger)]"><Trash2 size={13} /></button>
          )}
        </div>
      ))}
    </div>
  )
}
