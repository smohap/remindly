import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Ban, Check, FileText, Lock, Plus, Send, Trash2, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { cn } from '../lib/cn'
import { useGroups } from '../lib/useGroups'
import { usePremium } from '../lib/useWorkspace'
import {
  CURRENCIES, ME, REJECT_COMMENT_MAX,
  displayStatus, isOverdue, lineItemsTotal, money, useInvoices, validateInvoice,
  type Invoice, type LineItem,
} from '../lib/useInvoices'

const field =
  'w-full rounded-[12px] border border-[color:var(--glass-border)] bg-white/[0.08] px-3.5 py-2.5 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)] md:text-[0.85rem]'
const labelCls = 'mb-1.5 block text-[0.72rem] font-semibold text-[color:var(--ink-dim)]'
const primaryBtn =
  'cursor-pointer rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-4 py-2.5 text-[0.8rem] font-bold text-[#1a1240] transition hover:brightness-110'
const ghostBtn =
  'cursor-pointer rounded-full border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-2.5 text-[0.8rem] font-semibold text-[color:var(--ink-dim)] transition hover:text-white'

type Role = 'received' | 'sent'
type Filter = 'all' | 'pending' | 'overdue' | 'paid' | 'rejected' | 'cancelled'
const FILTERS: Filter[] = ['all', 'pending', 'overdue', 'paid', 'rejected', 'cancelled']

function StatusBadge({ inv }: { inv: Invoice }) {
  const s = displayStatus(inv)
  return <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.05em]', s.cls)}>{s.label}</span>
}

function fmtDate(d: string) {
  return new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d + 'T00:00:00'))
}
function fmtStamp(iso: string) {
  return new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

// ===========================================================================
function CreateInvoiceForm({ onDone }: { onDone: () => void }) {
  const { groups } = useGroups()
  const { createInvoice, dbMode, directory: dbDirectory } = useInvoices()
  const { user } = useAuth()

  // In DB mode the directory is real profiles the user shares a group with;
  // otherwise it's derived from the local group store.
  const directory = useMemo(() => {
    if (dbMode) return dbDirectory.map(d => ({ id: d.id, name: d.name }))
    const seen = new Map<string, string>()
    groups.forEach(g =>
      g.members.forEach(m => {
        const id = `u-${m.name.toLowerCase().split(' ')[0]}`
        if (m.name !== (user?.name ?? 'Priya Nair')) seen.set(id, m.name)
      }),
    )
    return [...seen.entries()].map(([id, name]) => ({ id, name }))
  }, [groups, user, dbMode, dbDirectory])

  const [recipientId, setRecipientId] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('NZD')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const itemsTotal = lineItemsTotal(items)
  const amountCents = items.length > 0 ? itemsTotal : Math.round(parseFloat(amount || '0') * 100)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const recipient = directory.find(d => d.id === recipientId)
    const input = {
      recipientId,
      recipientName: recipient?.name ?? '',
      amountCents,
      currency,
      description,
      dueDate,
      lineItems: items,
    }
    const err = validateInvoice(
      input,
      directory.map(d => d.id),
    )
    if (err) return setError(err)
    const saveErr = await createInvoice(input, user?.name ?? 'You')
    if (saveErr) return setError(saveErr)
    onDone()
  }

  return (
    <form onSubmit={submit} className="glass flex flex-col gap-4 p-6">
      <h3 className="font-display text-[1rem] font-bold">New invoice</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className={labelCls}>Send to</span>
          <select value={recipientId} onChange={e => setRecipientId(e.target.value)} className={field}>
            <option value="" className="bg-[color:var(--indigo)]">Choose a recipient…</option>
            {directory.map(d => (
              <option key={d.id} value={d.id} className="bg-[color:var(--indigo)]">{d.name} · {d.id}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>Due date</span>
          <input type="date" value={dueDate} min={new Date().toISOString().slice(0, 10)} onChange={e => setDueDate(e.target.value)} className={field} />
        </label>
        <label className="sm:col-span-2">
          <span className={labelCls}>Description</span>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this invoice for?" className={field} />
        </label>
        <label>
          <span className={labelCls}>
            Amount {items.length > 0 && <span className="text-[color:var(--ink-faint)]">(from line items)</span>}
          </span>
          <input
            type="number" step="0.01" min="0"
            value={items.length > 0 ? (itemsTotal / 100).toFixed(2) : amount}
            onChange={e => setAmount(e.target.value)}
            disabled={items.length > 0}
            placeholder="0.00"
            className={cn(field, items.length > 0 && 'cursor-not-allowed opacity-70')}
          />
        </label>
        <label>
          <span className={labelCls}>Currency</span>
          <select value={currency} onChange={e => setCurrency(e.target.value)} className={field}>
            {CURRENCIES.map(c => <option key={c} value={c} className="bg-[color:var(--indigo)]">{c}</option>)}
          </select>
        </label>
      </div>

      <div className="border-t border-white/10 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[0.78rem] font-bold">
            Line items <span className="font-normal text-[color:var(--ink-faint)]">(optional)</span>
          </span>
          <button
            type="button"
            onClick={() => setItems([...items, { id: `li-${Date.now()}`, name: '', qty: 1, unitPriceCents: 0 }])}
            className="flex cursor-pointer items-center gap-1.5 rounded-full bg-white/[0.1] px-3 py-1.5 text-[0.72rem] font-semibold transition hover:bg-white/[0.18]"
          >
            <Plus size={13} /> Add item
          </button>
        </div>
        {items.map((it, idx) => (
          <div key={it.id} className="mb-2 flex gap-2">
            <input
              value={it.name} placeholder="Item" aria-label="Item name"
              onChange={e => setItems(items.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
              className={cn(field, 'flex-1')}
            />
            <input
              type="number" min="1" value={it.qty} aria-label="Quantity"
              onChange={e => setItems(items.map((x, i) => (i === idx ? { ...x, qty: Number(e.target.value) } : x)))}
              className={cn(field, 'w-20')}
            />
            <input
              type="number" step="0.01" min="0" placeholder="Unit price" aria-label="Unit price"
              value={it.unitPriceCents ? (it.unitPriceCents / 100).toFixed(2) : ''}
              onChange={e => setItems(items.map((x, i) => (i === idx ? { ...x, unitPriceCents: Math.round(parseFloat(e.target.value || '0') * 100) } : x)))}
              className={cn(field, 'w-28')}
            />
            <button
              type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} aria-label="Remove item"
              className="shrink-0 cursor-pointer px-1 text-[color:var(--ink-faint)] transition hover:text-[color:var(--red)]"
            >
              <X size={16} />
            </button>
          </div>
        ))}
        {items.length > 0 && <div className="mt-2 text-right text-[0.85rem] font-bold">Total {money(itemsTotal, currency)}</div>}
      </div>

      {error && <p className="text-[0.8rem] text-[color:var(--red)]">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className={cn(primaryBtn, 'flex items-center gap-1.5')}>
          <Send size={14} /> Send invoice
        </button>
        <button type="button" onClick={onDone} className={ghostBtn}>Cancel</button>
      </div>
    </form>
  )
}

// ===========================================================================
function InvoiceDetail({ invoice, onBack }: { invoice: Invoice; onBack: () => void }) {
  const { markPaid, reject, cancel, addComment, deleteInvoice } = useInvoices()
  const { user } = useAuth()
  const actor = user?.name ?? 'You'
  const [mode, setMode] = useState<'none' | 'pay' | 'reject'>('none')
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const amIRecipient = invoice.recipientId === ME
  const amISender = invoice.senderId === ME
  const open = invoice.status === 'sent'

  async function run(fn: () => Promise<string | null>) {
    const err = await fn()
    if (err) return setError(err)
    setError(null)
    setMode('none')
    setComment('')
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <button onClick={onBack} className="flex w-fit cursor-pointer items-center gap-1.5 text-[0.8rem] font-semibold text-[color:var(--ink-dim)] transition hover:text-white">
        <ArrowLeft size={15} /> Back to invoices
      </button>

      <div className="glass flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-[1.3rem] font-bold">{invoice.number}</h2>
              <StatusBadge inv={invoice} />
            </div>
            <p className="mt-1 text-[0.85rem] text-[color:var(--ink-dim)]">{invoice.description}</p>
            <p className="mt-1 text-[0.75rem] text-[color:var(--ink-faint)]">
              {amISender ? `To ${invoice.recipientName}` : `From ${invoice.senderName}`} · due {fmtDate(invoice.dueDate)}
              {isOverdue(invoice) && <span className="text-[color:var(--red)]"> · past due</span>}
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-[1.8rem] font-extrabold leading-none">{money(invoice.amountCents, invoice.currency)}</div>
            <div className="text-[0.7rem] text-[color:var(--ink-faint)]">{invoice.currency}</div>
          </div>
        </div>

        {invoice.lineItems.length > 0 && (
          <div className="overflow-x-auto border-t border-white/10 pt-3">
            <table className="w-full text-[0.82rem]">
              <thead>
                <tr className="text-[0.68rem] uppercase tracking-[0.06em] text-[color:var(--ink-faint)]">
                  <th className="pb-2 text-left font-bold">Item</th>
                  <th className="pb-2 text-right font-bold">Qty</th>
                  <th className="pb-2 text-right font-bold">Unit</th>
                  <th className="pb-2 text-right font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map(li => (
                  <tr key={li.id} className="border-t border-white/5">
                    <td className="py-2">{li.name || '—'}</td>
                    <td className="py-2 text-right tabular-nums">{li.qty}</td>
                    <td className="py-2 text-right tabular-nums">{money(li.unitPriceCents, invoice.currency)}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{money(li.qty * li.unitPriceCents, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {invoice.resolutionComment && (
          <div className="rounded-[12px] border border-[color:var(--glass-border)] bg-white/[0.06] p-3 text-[0.8rem]">
            <span className="font-semibold">{invoice.status === 'rejected' ? 'Reason for rejection: ' : 'Note: '}</span>
            <span className="text-[color:var(--ink-dim)]">{invoice.resolutionComment}</span>
          </div>
        )}

        {error && <p className="text-[0.8rem] text-[color:var(--red)]">{error}</p>}

        {open && amIRecipient && mode === 'none' && (
          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <button onClick={() => setMode('pay')} className="flex cursor-pointer items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#2DD4BF,#1FA895)] px-4 py-2.5 text-[0.8rem] font-bold text-[#0c2b26] transition hover:brightness-110">
              <Check size={14} /> Mark as paid
            </button>
            <button onClick={() => setMode('reject')} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[rgba(255,107,107,0.4)] bg-white/[0.06] px-4 py-2.5 text-[0.8rem] font-semibold text-[color:var(--red)] transition hover:bg-[rgba(255,107,107,0.12)]">
              <Ban size={14} /> Reject
            </button>
          </div>
        )}

        {open && amISender && (
          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <button onClick={() => run(() => cancel(invoice.id, actor))} className={cn(ghostBtn, 'flex items-center gap-1.5')}>
              <Ban size={14} /> Cancel invoice
            </button>
            <span className="self-center text-[0.75rem] text-[color:var(--ink-faint)]">Waiting on {invoice.recipientName} to settle.</span>
          </div>
        )}

        {mode === 'pay' && (
          <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
            <p className="text-[0.85rem] font-semibold">Mark {money(invoice.amountCents, invoice.currency)} as paid?</p>
            <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Optional note (e.g. paid via bank transfer)" className={field} />
            <div className="flex gap-2">
              <button onClick={() => run(() => markPaid(invoice.id, comment, actor))} className={primaryBtn}>Confirm payment</button>
              <button onClick={() => { setMode('none'); setComment('') }} className={ghostBtn}>Back</button>
            </div>
          </div>
        )}

        {mode === 'reject' && (
          <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
            <p className="text-[0.85rem] font-semibold">Reject this invoice</p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value.slice(0, REJECT_COMMENT_MAX))}
              rows={3} required placeholder="Why are you rejecting it? (required)"
              className={cn(field, 'resize-none')}
            />
            <span className="text-[0.7rem] text-[color:var(--ink-faint)]">{comment.length}/{REJECT_COMMENT_MAX}</span>
            <div className="flex gap-2">
              <button
                onClick={() => run(() => reject(invoice.id, comment, actor))}
                disabled={!comment.trim()}
                className="cursor-pointer rounded-full bg-[color:var(--red)] px-4 py-2.5 text-[0.8rem] font-bold text-[#3a0d0d] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reject invoice
              </button>
              <button onClick={() => { setMode('none'); setComment('') }} className={ghostBtn}>Back</button>
            </div>
          </div>
        )}
      </div>

      <div className="glass p-6">
        <h3 className="font-display mb-4 text-[0.95rem] font-bold">Activity</h3>
        <ol className="flex flex-col gap-4">
          {invoice.events.map((e, i) => (
            <li key={e.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                  e.action === 'paid' ? 'bg-[color:var(--teal)]'
                    : e.action === 'rejected' || e.action === 'cancelled' ? 'bg-[color:var(--red)]'
                    : 'bg-[color:var(--violet)]')} />
                {i < invoice.events.length - 1 && <span className="mt-1 w-px flex-1 bg-white/15" />}
              </div>
              <div className="pb-1">
                <div className="text-[0.82rem]">
                  <span className="font-bold">{e.actor}</span>{' '}
                  <span className="text-[color:var(--ink-dim)]">
                    {e.action === 'created' ? 'created this invoice'
                      : e.action === 'sent' ? 'sent it'
                      : e.action === 'paid' ? 'marked it as paid'
                      : e.action === 'rejected' ? 'rejected it'
                      : e.action === 'cancelled' ? 'cancelled it'
                      : e.action === 'commented' ? 'commented'
                      : 'viewed it'}
                  </span>
                </div>
                {e.comment && <div className="mt-0.5 text-[0.78rem] text-[color:var(--ink-dim)]">“{e.comment}”</div>}
                <div className="mt-0.5 text-[0.68rem] text-[color:var(--ink-faint)]">{fmtStamp(e.at)}</div>
              </div>
            </li>
          ))}
        </ol>

        <form
          onSubmit={e => { e.preventDefault(); addComment(invoice.id, note, actor); setNote('') }}
          className="mt-4 flex gap-2 border-t border-white/10 pt-4"
        >
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a comment…" aria-label="Add a comment" className={cn(field, 'rounded-full py-2')} />
          <button type="submit" className="shrink-0 cursor-pointer rounded-full bg-white/[0.12] px-4 py-2 text-[0.75rem] font-bold transition hover:bg-white/[0.2]">Post</button>
        </form>
      </div>

      <button
        onClick={() => { deleteInvoice(invoice.id); onBack() }}
        className="flex w-fit cursor-pointer items-center gap-1.5 text-[0.75rem] font-semibold text-[color:var(--ink-faint)] transition hover:text-[color:var(--red)]"
      >
        <Trash2 size={13} /> Delete from my records
      </button>
    </div>
  )
}

// ===========================================================================
export function InvoicesView() {
  const { isPremium, setPremium } = usePremium()
  const { sent, received, outstandingCents, awaitingCents } = useInvoices()
  const [role, setRole] = useState<Role>('received')
  const [filter, setFilter] = useState<Filter>('all')
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const all = role === 'sent' ? sent : received
  const list = all.filter(i => {
    if (filter === 'all') return true
    if (filter === 'pending') return i.status === 'sent' && !isOverdue(i)
    if (filter === 'overdue') return isOverdue(i)
    return i.status === filter
  })

  const openInvoice = [...sent, ...received].find(i => i.id === openId) ?? null

  if (!isPremium) {
    return (
      <div className="glass flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] text-[#1a1240]">
          <Lock size={20} />
        </span>
        <h3 className="font-display text-[1.15rem] font-bold">Invoicing</h3>
        <p className="max-w-md text-[0.85rem] leading-relaxed text-[color:var(--ink-dim)]">
          Create and send invoices to anyone in your groups, track what you're owed, and settle or dispute with a full audit trail.
          Available on Personal Plus and all business plans.
        </p>
        <button onClick={() => setPremium(true)} className={primaryBtn}>Unlock Premium</button>
      </div>
    )
  }

  if (openInvoice) return <InvoiceDetail invoice={openInvoice} onBack={() => setOpenId(null)} />

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[1.05rem] font-bold">Invoices</h2>
          <p className="text-[0.78rem] text-[color:var(--ink-dim)]">Send invoices, get paid, and keep an auditable record of every change.</p>
        </div>
        <button onClick={() => setCreating(v => !v)} className={cn(primaryBtn, 'flex items-center gap-1.5')}>
          <Plus size={15} /> New invoice
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="glass p-5">
          <div className="text-[0.7rem] uppercase tracking-[0.08em] text-[color:var(--ink-faint)]">You owe</div>
          <div className="font-display text-[1.5rem] font-extrabold">{money(outstandingCents)}</div>
          <div className="text-[0.72rem] text-[color:var(--ink-faint)]">{received.filter(i => i.status === 'sent').length} open invoice(s)</div>
        </div>
        <div className="glass p-5">
          <div className="text-[0.7rem] uppercase tracking-[0.08em] text-[color:var(--ink-faint)]">Owed to you</div>
          <div className="font-display text-[1.5rem] font-extrabold">{money(awaitingCents)}</div>
          <div className="text-[0.72rem] text-[color:var(--ink-faint)]">{sent.filter(i => i.status === 'sent').length} awaiting payment</div>
        </div>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <CreateInvoiceForm onDone={() => setCreating(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass inline-flex w-fit gap-1 rounded-full p-1">
        {(['received', 'sent'] as const).map(r => (
          <button key={r} onClick={() => setRole(r)} className="relative rounded-full px-5 py-2 text-[0.8rem] font-bold transition-colors">
            {role === r && <motion.span layoutId="inv-role" className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))]" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
            <span className={cn('relative', role === r ? 'text-[#1a1240]' : 'text-[color:var(--ink-dim)]')}>
              {r === 'received' ? 'Received' : 'Sent by me'}
            </span>
          </button>
        ))}
      </div>

      <div className="scrollbar-hidden -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {FILTERS.map(f => (
          <button
            key={f} onClick={() => setFilter(f)}
            className={cn('shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-[0.75rem] font-semibold capitalize transition',
              filter === f ? 'bg-[color:var(--glass-strong)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]' : 'text-[color:var(--ink-faint)] hover:text-[color:var(--ink-dim)]')}
          >
            {f}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="glass flex flex-col items-center gap-2 px-6 py-12 text-center">
          <FileText size={34} className="text-[color:var(--ink-faint)]" />
          <h3 className="font-display text-[0.95rem] font-bold">No {filter === 'all' ? '' : filter} invoices here</h3>
          <p className="max-w-xs text-[0.8rem] text-[color:var(--ink-dim)]">
            {role === 'sent' ? 'Create an invoice to request payment from someone in your groups.' : 'Invoices sent to you will appear here.'}
          </p>
        </div>
      ) : (
        list.map(inv => (
          <button key={inv.id} onClick={() => setOpenId(inv.id)} className="glass flex items-center gap-3.5 px-[18px] py-4 text-left transition hover:bg-white/[0.13]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-base">🧾</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.9rem] font-bold">{inv.number}</span>
                <StatusBadge inv={inv} />
              </div>
              <div className="truncate text-[0.75rem] text-[color:var(--ink-faint)]">
                {role === 'sent' ? `To ${inv.recipientName}` : `From ${inv.senderName}`} · {inv.description} · due {fmtDate(inv.dueDate)}
              </div>
            </div>
            <span className="font-display shrink-0 text-[1rem] font-extrabold tabular-nums">{money(inv.amountCents, inv.currency)}</span>
          </button>
        ))
      )}
    </div>
  )
}
