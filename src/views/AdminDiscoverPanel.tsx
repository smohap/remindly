import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { RECURRENCES, describeRecurrence, type Recurrence } from '../lib/recurrence'
import { useDiscoverAdmin } from '../lib/useDiscover'
import { formatDate } from '../lib/usePremium'

/**
 * Admin console → Discover events. Super Admins publish the catalogue that
 * every user sees under Calendar → Discover.
 */
export function AdminDiscoverPanel({ canPublish, onNotice }: { canPublish: boolean; onNotice: (m: string) => void }) {
  const { events, publish, remove } = useDiscoverAdmin()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState('')
  const [meta, setMeta] = useState('')
  const [icon, setIcon] = useState('📅')
  const [nextDate, setNextDate] = useState('')
  const [timeLabel, setTimeLabel] = useState('')
  const [recurrence, setRecurrence] = useState<Recurrence | ''>('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !scope.trim() || !nextDate) return
    await publish({ title: title.trim(), scope: scope.trim(), meta: meta.trim(), icon: icon || '📅', nextDate, timeLabel: timeLabel || undefined, recurrence: recurrence || undefined })
    onNotice(`Published “${title.trim()}”`)
    setTitle(''); setScope(''); setMeta(''); setIcon('📅'); setNextDate(''); setTimeLabel(''); setRecurrence('')
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-[0.8rem] text-[color:var(--ink-dim)]">Public events anyone can subscribe to. Subscribing adds a reminder to their list.</p>
        {canPublish && (
          <button onClick={() => setOpen(v => !v)} className="btn-primary shrink-0">
            <Plus size={15} /> Publish event
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className="card grid gap-3 p-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[0.72rem] font-semibold text-[color:var(--ink-dim)] sm:col-span-2">
            Title
            <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. GST return due" className="field" />
          </label>
          <label className="flex flex-col gap-1 text-[0.72rem] font-semibold text-[color:var(--ink-dim)]">
            Scope
            <input value={scope} onChange={e => setScope(e.target.value)} required placeholder="e.g. NZ · Business" className="field" />
          </label>
          <label className="flex flex-col gap-1 text-[0.72rem] font-semibold text-[color:var(--ink-dim)]">
            Icon
            <input value={icon} onChange={e => setIcon(e.target.value)} maxLength={4} className="field" />
          </label>
          <label className="flex flex-col gap-1 text-[0.72rem] font-semibold text-[color:var(--ink-dim)]">
            Next date
            <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} required className="field" />
          </label>
          <label className="flex flex-col gap-1 text-[0.72rem] font-semibold text-[color:var(--ink-dim)]">
            Time (optional)
            <input value={timeLabel} onChange={e => setTimeLabel(e.target.value)} placeholder="e.g. 5:00 PM" className="field" />
          </label>
          <label className="flex flex-col gap-1 text-[0.72rem] font-semibold text-[color:var(--ink-dim)]">
            Repeats
            <select value={recurrence} onChange={e => setRecurrence(e.target.value as Recurrence | '')} className="field">
              <option value="">Does not repeat</option>
              {RECURRENCES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[0.72rem] font-semibold text-[color:var(--ink-dim)]">
            Note (optional)
            <input value={meta} onChange={e => setMeta(e.target.value)} placeholder="Shown under the title" className="field" />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="btn-primary flex-1">Publish</button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      {events.length === 0 ? (
        <div className="card px-6 py-10 text-center text-[0.82rem] text-[color:var(--ink-dim)]">No events published yet.</div>
      ) : (
        events.map(e => (
          <div key={e.id} className="card group flex items-center gap-3.5 px-[18px] py-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white/[0.06] text-[1.1rem]" aria-hidden>{e.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.9rem] font-bold">{e.title}</div>
              <div className="text-[0.74rem] text-[color:var(--ink-faint)]">
                {[e.scope, e.nextDate ? formatDate(e.nextDate) : null, e.timeLabel, e.recurrence ? describeRecurrence(e.recurrence) : null].filter(Boolean).join(' · ')}
              </div>
            </div>
            {canPublish && (
              <button onClick={() => void remove(e.id)} aria-label={`Remove ${e.title}`} className="btn-ghost btn-danger px-2.5 opacity-0 transition group-hover:opacity-100 focus:opacity-100">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))
      )}
    </div>
  )
}
