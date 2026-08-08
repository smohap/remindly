import { useCallback, useSyncExternalStore } from 'react'
import { makeStore } from './localStore'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'rejected' | 'cancelled'
export type InvoiceAction = 'created' | 'sent' | 'viewed' | 'paid' | 'rejected' | 'cancelled' | 'commented'

export interface LineItem {
  id: string
  name: string
  qty: number
  unitPriceCents: number
}

export interface InvoiceEvent {
  id: string
  actor: string
  action: InvoiceAction
  comment?: string
  at: string
}

export interface Invoice {
  id: string
  number: string
  senderId: string
  senderName: string
  recipientId: string
  recipientName: string
  amountCents: number
  currency: string
  description: string
  lineItems: LineItem[]
  dueDate: string // YYYY-MM-DD
  status: InvoiceStatus
  createdAt: string
  sentAt?: string
  resolvedAt?: string
  resolutionComment?: string
  events: InvoiceEvent[]
}

export const CURRENCIES = ['NZD', 'AUD', 'USD', 'GBP', 'EUR', 'INR']
export const REJECT_COMMENT_MAX = 1000

/** The signed-in user's stable id in this local build. */
export const ME = 'me'

const iso = () => new Date().toISOString()
const day = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

function ev(actor: string, action: InvoiceAction, comment?: string, at = iso()): InvoiceEvent {
  return { id: `e-${Math.random().toString(36).slice(2, 9)}`, actor, action, comment, at }
}

const seed: Invoice[] = [
  {
    id: 'inv-1',
    number: 'INV-1004',
    senderId: 'u-tama',
    senderName: 'Tama Wright',
    recipientId: ME,
    recipientName: 'You',
    amountCents: 45000,
    currency: 'NZD',
    description: 'Site A safety equipment restock',
    lineItems: [
      { id: 'li-1', name: 'Hi-vis vests', qty: 10, unitPriceCents: 2500 },
      { id: 'li-2', name: 'Hard hats', qty: 5, unitPriceCents: 4000 },
    ],
    dueDate: day(6),
    status: 'sent',
    createdAt: iso(),
    sentAt: iso(),
    events: [ev('Tama Wright', 'created'), ev('Tama Wright', 'sent')],
  },
  {
    id: 'inv-2',
    number: 'INV-1003',
    senderId: 'u-riley',
    senderName: 'Coach Riley',
    recipientId: ME,
    recipientName: 'You',
    amountCents: 12000,
    currency: 'NZD',
    description: 'Wellington Rugby — season subs',
    lineItems: [],
    dueDate: day(-3),
    status: 'sent',
    createdAt: iso(),
    sentAt: iso(),
    events: [ev('Coach Riley', 'created'), ev('Coach Riley', 'sent')],
  },
  {
    id: 'inv-3',
    number: 'INV-1002',
    senderId: ME,
    senderName: 'You',
    recipientId: 'u-sione',
    recipientName: 'Sione Vaka',
    amountCents: 28000,
    currency: 'NZD',
    description: 'Consulting — August site audit',
    lineItems: [{ id: 'li-3', name: 'Audit day rate', qty: 2, unitPriceCents: 14000 }],
    dueDate: day(11),
    status: 'sent',
    createdAt: iso(),
    sentAt: iso(),
    events: [ev('You', 'created'), ev('You', 'sent')],
  },
  {
    id: 'inv-4',
    number: 'INV-1001',
    senderId: ME,
    senderName: 'You',
    recipientId: 'u-tama',
    recipientName: 'Tama Wright',
    amountCents: 9500,
    currency: 'NZD',
    description: 'Shared toolbox purchase',
    lineItems: [],
    dueDate: day(-14),
    status: 'paid',
    createdAt: iso(),
    sentAt: iso(),
    resolvedAt: iso(),
    resolutionComment: 'Paid via bank transfer',
    events: [ev('You', 'created'), ev('You', 'sent'), ev('Tama Wright', 'paid', 'Paid via bank transfer')],
  },
]

const store = makeStore<Invoice[]>('remindly.invoices.v1', seed)

// ---------------------------------------------------------------------------
export function isOverdue(inv: Invoice): boolean {
  return inv.status === 'sent' && inv.dueDate < new Date().toISOString().slice(0, 10)
}

export function displayStatus(inv: Invoice): { label: string; cls: string } {
  if (isOverdue(inv)) return { label: 'Overdue', cls: 'bg-[rgba(255,107,107,0.18)] text-[#FFB4B4]' }
  switch (inv.status) {
    case 'paid':
      return { label: 'Paid', cls: 'bg-[rgba(45,212,191,0.18)] text-[#7BE9D8]' }
    case 'rejected':
      return { label: 'Rejected', cls: 'bg-[rgba(255,107,107,0.18)] text-[#FFB4B4]' }
    case 'cancelled':
      return { label: 'Cancelled', cls: 'bg-white/[0.12] text-[color:var(--ink-faint)]' }
    case 'draft':
      return { label: 'Draft', cls: 'bg-white/[0.12] text-[color:var(--ink-dim)]' }
    default:
      return { label: 'Pending', cls: 'bg-[rgba(251,191,36,0.18)] text-[#FCD770]' }
  }
}

export function money(cents: number, currency = 'NZD'): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency }).format(cents / 100)
}

export function lineItemsTotal(items: LineItem[]): number {
  return items.reduce((sum, i) => sum + i.qty * i.unitPriceCents, 0)
}

export interface CreateInvoiceInput {
  recipientId: string
  recipientName: string
  amountCents: number
  currency: string
  description: string
  dueDate: string
  lineItems: LineItem[]
}

/** Validate per spec 5.1 — returns an error string, or null when valid. */
export function validateInvoice(input: CreateInvoiceInput, knownIds: string[]): string | null {
  if (!input.recipientId) return 'Choose who this invoice is for.'
  if (input.recipientId === ME) return "You can't invoice yourself."
  if (!knownIds.includes(input.recipientId)) return "That recipient doesn't exist."
  if (!(input.amountCents > 0)) return 'Amount must be greater than zero.'
  if (!input.description.trim()) return 'Add a short description.'
  if (!input.dueDate) return 'Choose a due date.'
  if (input.dueDate < new Date().toISOString().slice(0, 10)) return 'Due date must be today or later.'
  return null
}

export function useInvoices() {
  const invoices = useSyncExternalStore(store.subscribe, store.get, store.get)

  const sent = invoices.filter(i => i.senderId === ME)
  const received = invoices.filter(i => i.recipientId === ME)

  const patch = (id: string, fn: (inv: Invoice) => Invoice) => {
    store.set(store.get().map(i => (i.id === id ? fn(i) : i)))
  }

  const createInvoice = useCallback((input: CreateInvoiceInput, senderName: string) => {
    const cur = store.get()
    const nextNum = 1005 + cur.filter(i => i.senderId === ME).length
    const inv: Invoice = {
      id: `inv-${Date.now()}`,
      number: `INV-${nextNum}`,
      senderId: ME,
      senderName,
      recipientId: input.recipientId,
      recipientName: input.recipientName,
      amountCents: input.amountCents,
      currency: input.currency,
      description: input.description.trim(),
      lineItems: input.lineItems,
      dueDate: input.dueDate,
      status: 'sent',
      createdAt: iso(),
      sentAt: iso(),
      events: [ev(senderName, 'created'), ev(senderName, 'sent')],
    }
    store.set([inv, ...cur])
    return inv
  }, [])

  /** Recipient only, and only from a non-terminal state (atomic guard). */
  const markPaid = useCallback((id: string, comment: string, actor: string): string | null => {
    const inv = store.get().find(i => i.id === id)
    if (!inv) return 'Invoice not found.'
    if (inv.recipientId !== ME) return 'Only the recipient can settle this invoice.'
    if (inv.status !== 'sent') return `This invoice was already ${inv.status}.`
    patch(id, i => ({
      ...i,
      status: 'paid',
      resolvedAt: iso(),
      resolutionComment: comment.trim() || undefined,
      events: [...i.events, ev(actor, 'paid', comment.trim() || undefined)],
    }))
    return null
  }, [])

  const reject = useCallback((id: string, comment: string, actor: string): string | null => {
    const inv = store.get().find(i => i.id === id)
    if (!inv) return 'Invoice not found.'
    if (inv.recipientId !== ME) return 'Only the recipient can reject this invoice.'
    if (inv.status !== 'sent') return `This invoice was already ${inv.status}.`
    const reason = comment.trim()
    if (!reason) return 'A reason is required to reject an invoice.'
    if (reason.length > REJECT_COMMENT_MAX) return `Keep the reason under ${REJECT_COMMENT_MAX} characters.`
    patch(id, i => ({
      ...i,
      status: 'rejected',
      resolvedAt: iso(),
      resolutionComment: reason,
      events: [...i.events, ev(actor, 'rejected', reason)],
    }))
    return null
  }, [])

  const cancel = useCallback((id: string, actor: string): string | null => {
    const inv = store.get().find(i => i.id === id)
    if (!inv) return 'Invoice not found.'
    if (inv.senderId !== ME) return 'Only the sender can cancel this invoice.'
    if (inv.status !== 'sent') return `This invoice was already ${inv.status}.`
    patch(id, i => ({ ...i, status: 'cancelled', resolvedAt: iso(), events: [...i.events, ev(actor, 'cancelled')] }))
    return null
  }, [])

  const addComment = useCallback((id: string, comment: string, actor: string) => {
    const c = comment.trim()
    if (!c) return
    patch(id, i => ({ ...i, events: [...i.events, ev(actor, 'commented', c)] }))
  }, [])

  const deleteInvoice = useCallback((id: string) => {
    store.set(store.get().filter(i => i.id !== id))
  }, [])

  const outstandingCents = received.filter(i => i.status === 'sent').reduce((s, i) => s + i.amountCents, 0)
  const awaitingCents = sent.filter(i => i.status === 'sent').reduce((s, i) => s + i.amountCents, 0)

  return { invoices, sent, received, createInvoice, markPaid, reject, cancel, addComment, deleteInvoice, outstandingCents, awaitingCents }
}
