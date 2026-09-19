import { useRef, useState } from 'react'
import { Check, Download, FileText, ListChecks, Lock, Pencil, Plus, StickyNote, Trash2, Upload, X } from 'lucide-react'
import { cn } from '../lib/cn'
import { usePlan } from '../lib/usePlan'
import { accessFor, formatBytes, useGroupWorkspace, newWorkspaceId, WORKSPACE_ACCESS_LABEL, type GroupDoc, type GroupNote, type WorkspaceAccess } from '../lib/useGroupWorkspace'
import { SegmentBar } from './SegmentBar'
import { UpgradeGate } from './UpgradeGate'

type Seg = 'lists' | 'notes' | 'docs'

/** A group member an admin can grant access to (admins themselves excluded). */
export interface WorkspaceMember {
  userId: string
  name: string
}

/**
 * Shared lists, notes and documents for one group.
 *
 * Access is per list and per note: admins set a default for members and may
 * override it per member from the item's Access panel. `isAdmin` unlocks
 * create / rename / delete and those panels; `myUserId` resolves the
 * viewer's own access. Docs additionally need Personal Plus or a business
 * plan. RLS (0015) is the real gate; this only shapes the UI.
 */
export function GroupWorkspace({ groupId, isAdmin, myUserId, members }: { groupId: string; isAdmin: boolean; myUserId?: string; members: WorkspaceMember[] }) {
  const ws = useGroupWorkspace(groupId)
  const { can } = usePlan()
  const [seg, setSeg] = useState<Seg>('lists')
  const lists = ws.lists.filter(l => accessFor(l, myUserId, isAdmin) !== 'none')
  const notes = ws.notes.filter(n => accessFor(n, myUserId, isAdmin) !== 'none')
  return (
    <div className="flex flex-col gap-3">
      <SegmentBar
        label="Group workspace"
        value={seg}
        onChange={setSeg}
        segments={[
          { key: 'lists', label: 'Lists', icon: ListChecks, badge: lists.length },
          { key: 'notes', label: 'Notes', icon: StickyNote, badge: notes.length },
          { key: 'docs', label: 'Docs', icon: FileText, badge: ws.docs.length },
        ]}
      />
      {ws.error && <p className="text-[0.76rem] text-[color:var(--danger)]">{ws.error}</p>}
      {ws.loading && <p className="text-[0.76rem] text-[color:var(--ink-faint)]">Loading…</p>}
      {seg === 'lists' && <Lists ws={ws} lists={lists} isAdmin={isAdmin} myUserId={myUserId} members={members} />}
      {seg === 'notes' && <Notes ws={ws} notes={notes} isAdmin={isAdmin} myUserId={myUserId} members={members} />}
      {seg === 'docs' &&
        (can('group_docs') ? (
          <Docs ws={ws} isAdmin={isAdmin} />
        ) : (
          <UpgradeGate feature="group_docs" description="Upload and share documents (up to 20 MB each) with this group. Included in Personal Plus and all business plans." />
        ))}
    </div>
  )
}

type WS = ReturnType<typeof useGroupWorkspace>
type Shared = { defaultAccess: WorkspaceAccess; overrides: Record<string, WorkspaceAccess> }

const ACCESS_KEYS = Object.keys(WORKSPACE_ACCESS_LABEL) as WorkspaceAccess[]
const SELECT = 'field w-auto shrink-0 px-2 py-1 text-[0.7rem]'
const OPTION = 'bg-[color:var(--surface-2)]'

/** Admin panel: who may see and edit this one list or note. */
function AccessPanel({ item, members, onDefault, onMember }: { item: Shared; members: WorkspaceMember[]; onDefault: (a: WorkspaceAccess) => void; onMember: (userId: string, a: WorkspaceAccess | null) => void }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-[color:var(--surface-2)] p-2.5 text-[0.76rem]">
      <label className="flex items-center justify-between gap-2">
        <span className="font-semibold">Members by default</span>
        <select value={item.defaultAccess} onChange={e => onDefault(e.target.value as WorkspaceAccess)} aria-label="Default access for members" className={SELECT}>
          {ACCESS_KEYS.map(a => (
            <option key={a} value={a} className={OPTION}>{WORKSPACE_ACCESS_LABEL[a]}</option>
          ))}
        </select>
      </label>
      {members.length === 0 && <p className="text-[0.7rem] text-[color:var(--ink-faint)]">No other members yet — invite people and you can set their access here.</p>}
      {members.map(m => {
        const override = item.overrides[m.userId]
        return (
          <label key={m.userId} className="flex items-center justify-between gap-2">
            <span className="truncate text-[color:var(--ink-dim)]">{m.name}</span>
            <select value={override ?? ''} onChange={e => onMember(m.userId, (e.target.value || null) as WorkspaceAccess | null)} aria-label={`Access for ${m.name}`} className={SELECT}>
              <option value="" className={OPTION}>Default ({WORKSPACE_ACCESS_LABEL[item.defaultAccess]})</option>
              {ACCESS_KEYS.map(a => (
                <option key={a} value={a} className={OPTION}>{WORKSPACE_ACCESS_LABEL[a]}</option>
              ))}
            </select>
          </label>
        )
      })}
      <p className="text-[0.66rem] text-[color:var(--ink-faint)]">Group admins always have full access.</p>
    </div>
  )
}

function AccessButton({ open, onClick, what }: { open: boolean; onClick: () => void; what: string }) {
  return (
    <button onClick={onClick} aria-label={`Access for ${what}`} aria-expanded={open} title="Who can see and edit this" className={cn('btn-ghost px-2 py-1 text-[0.7rem]', open && 'bg-[color:var(--subtle-2)]')}>
      <Lock size={12} /> Access
    </button>
  )
}

function Lists({ ws, lists, isAdmin, myUserId, members }: { ws: WS; lists: WS['lists']; isAdmin: boolean; myUserId?: string; members: WorkspaceMember[] }) {
  const [name, setName] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const [accessOpen, setAccessOpen] = useState<string | null>(null)
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
      {lists.length === 0 && !ws.loading && <p className="text-[0.76rem] text-[color:var(--ink-faint)]">{isAdmin ? 'No shared lists yet.' : 'No lists have been shared with you.'}</p>}
      {lists.map(l => {
        const done = l.items.filter(i => i.done).length
        const canWrite = accessFor(l, myUserId, isAdmin) === 'write'
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[0.84rem] font-semibold">{l.name}</span>
                <span className="text-[0.68rem] text-[color:var(--ink-faint)]">{done}/{l.items.length} done</span>
                {!canWrite && <span className="badge bg-[color:var(--subtle-2)] text-[color:var(--ink-dim)]">View only</span>}
                {isAdmin && (
                  <>
                    <AccessButton open={accessOpen === l.id} onClick={() => setAccessOpen(accessOpen === l.id ? null : l.id)} what={`list ${l.name}`} />
                    <button onClick={() => setRenaming({ id: l.id, name: l.name })} aria-label={`Rename list ${l.name}`} title="Rename" className="text-[color:var(--ink-faint)] hover:text-[color:var(--ink)]"><Pencil size={13} /></button>
                    <button onClick={() => void ws.deleteList(l.id)} aria-label={`Delete list ${l.name}`} title="Delete" className="text-[color:var(--ink-faint)] hover:text-[color:var(--danger)]"><Trash2 size={13} /></button>
                  </>
                )}
              </div>
            )}
            {isAdmin && accessOpen === l.id && (
              <AccessPanel item={l} members={members} onDefault={a => void ws.setListDefault(l.id, a)} onMember={(u, a) => void ws.setListMemberAccess(l.id, u, a)} />
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

function Notes({ ws, notes, isAdmin, myUserId, members }: { ws: WS; notes: WS['notes']; isAdmin: boolean; myUserId?: string; members: WorkspaceMember[] }) {
  const [editing, setEditing] = useState<GroupNote | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [accessOpen, setAccessOpen] = useState<string | null>(null)
  const open = (n?: GroupNote) => {
    setEditing(n ?? { id: '', title: '', body: '', updatedAt: '', defaultAccess: 'read', overrides: {} })
    setTitle(n?.title ?? '')
    setBody(n?.body ?? '')
  }
  // Renaming a note is an admin job; writers edit the body.
  const canRename = isAdmin
  return (
    <div className="flex flex-col gap-2">
      {isAdmin && !editing && (
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
      {notes.length === 0 && !ws.loading && <p className="text-[0.76rem] text-[color:var(--ink-faint)]">{isAdmin ? 'No shared notes yet.' : 'No notes have been shared with you.'}</p>}
      {notes.map(n => {
        const canWrite = accessFor(n, myUserId, isAdmin) === 'write'
        return (
          <div key={n.id} className="card-2 flex flex-col gap-1.5 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[0.84rem] font-semibold">{n.title}</span>
              <span className="text-[0.66rem] text-[color:var(--ink-faint)]">{new Date(n.updatedAt).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}</span>
              {!canWrite && <span className="badge bg-[color:var(--subtle-2)] text-[color:var(--ink-dim)]">View only</span>}
              {canWrite && <button onClick={() => open(n)} className="btn-ghost px-2 py-1 text-[0.7rem]">Edit</button>}
              {isAdmin && (
                <>
                  <AccessButton open={accessOpen === n.id} onClick={() => setAccessOpen(accessOpen === n.id ? null : n.id)} what={`note ${n.title}`} />
                  <button onClick={() => void ws.deleteNote(n.id)} aria-label={`Delete note ${n.title}`} title="Delete" className="text-[color:var(--ink-faint)] hover:text-[color:var(--danger)]"><Trash2 size={13} /></button>
                </>
              )}
            </div>
            {isAdmin && accessOpen === n.id && (
              <AccessPanel item={n} members={members} onDefault={a => void ws.setNoteDefault(n.id, a)} onMember={(u, a) => void ws.setNoteMemberAccess(n.id, u, a)} />
            )}
            {n.body && <p className="whitespace-pre-wrap text-[0.8rem] leading-relaxed text-[color:var(--ink-dim)]">{n.body}</p>}
          </div>
        )
      })}
    </div>
  )
}

function Docs({ ws, isAdmin }: { ws: WS; isAdmin: boolean }) {
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
          {(isAdmin || d.mine) && (
            <button onClick={() => void ws.deleteDoc(d)} aria-label={`Delete ${d.name}`} className="text-[color:var(--ink-faint)] hover:text-[color:var(--danger)]"><Trash2 size={13} /></button>
          )}
        </div>
      ))}
    </div>
  )
}
