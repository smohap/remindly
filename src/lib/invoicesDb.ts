import { supabase } from './supabase'
import type { Invoice, InvoiceAction, InvoiceEvent, LineItem } from './useInvoices'

/**
 * Supabase-backed invoice access. Every function assumes `supabase` is
 * configured and a user is signed in; callers gate on that.
 *
 * Server-side rules (supabase/migrations/0002_premium_features.sql) are the real
 * enforcement: RLS restricts visibility to the two parties, and the
 * `invoice_transition_guard` trigger enforces who may settle/reject/cancel and
 * blocks any change to an already-resolved invoice.
 */

export interface DirectoryUser {
  id: string
  name: string
  email: string
}

interface EventRow {
  id: string
  action: InvoiceAction
  comment: string | null
  created_at: string
  actor?: { full_name: string | null } | null
}

interface InvoiceRow {
  id: string
  number: string
  sender_id: string
  recipient_id: string
  amount_cents: number
  currency: string
  description: string
  line_items: LineItem[]
  due_date: string
  status: Invoice['status']
  created_at: string
  sent_at: string | null
  resolved_at: string | null
  resolution_comment: string | null
  sender?: { full_name: string | null } | null
  recipient?: { full_name: string | null } | null
  invoice_events?: EventRow[]
}

const SELECT = `
  id, number, sender_id, recipient_id, amount_cents, currency, description,
  line_items, due_date, status, created_at, sent_at, resolved_at, resolution_comment,
  sender:profiles!invoices_sender_id_fkey ( full_name ),
  recipient:profiles!invoices_recipient_id_fkey ( full_name ),
  invoice_events ( id, action, comment, created_at, actor:profiles ( full_name ) )
`

function toInvoice(row: InvoiceRow, myId: string): Invoice {
  const events: InvoiceEvent[] = (row.invoice_events ?? [])
    .map(e => ({
      id: e.id,
      actor: e.actor?.full_name ?? 'Someone',
      action: e.action,
      comment: e.comment ?? undefined,
      at: e.created_at,
    }))
    .sort((a, b) => a.at.localeCompare(b.at))

  return {
    id: row.id,
    number: row.number,
    senderId: row.sender_id === myId ? 'me' : row.sender_id,
    senderName: row.sender_id === myId ? 'You' : (row.sender?.full_name ?? 'Someone'),
    recipientId: row.recipient_id === myId ? 'me' : row.recipient_id,
    recipientName: row.recipient_id === myId ? 'You' : (row.recipient?.full_name ?? 'Someone'),
    amountCents: Number(row.amount_cents),
    currency: row.currency,
    description: row.description,
    lineItems: Array.isArray(row.line_items) ? row.line_items : [],
    dueDate: row.due_date,
    status: row.status,
    createdAt: row.created_at,
    sentAt: row.sent_at ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    resolutionComment: row.resolution_comment ?? undefined,
    events,
  }
}

/** Turn a Postgres/RLS error into something a person can act on. */
function readable(message: string): string {
  if (/already (paid|rejected|cancelled)/i.test(message)) return message
  if (/Only the recipient/i.test(message)) return 'Only the recipient can settle or reject this invoice.'
  if (/Only the sender/i.test(message)) return 'Only the sender can cancel this invoice.'
  if (/invoice_reject_needs_reason/i.test(message)) return 'A reason is required to reject an invoice.'
  if (/invoice_no_self/i.test(message)) return "You can't invoice yourself."
  if (/row-level security/i.test(message)) return "You don't have permission to do that."
  return message
}

export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/** Everyone the signed-in user shares a group with — the invoice directory. */
export async function fetchDirectory(myId: string): Promise<DirectoryUser[]> {
  if (!supabase) return []
  const { data: memberships } = await supabase.from('group_members').select('group_id').eq('user_id', myId)
  const groupIds = (memberships ?? []).map(m => m.group_id as string)
  if (groupIds.length === 0) return []

  const { data } = await supabase
    .from('group_members')
    .select('user_id, profiles ( id, full_name, email )')
    .in('group_id', groupIds)

  const seen = new Map<string, DirectoryUser>()
  const rows = (data ?? []) as unknown as { profiles: { id: string; full_name: string | null; email: string | null } | null }[]
  for (const row of rows) {
    const p = row.profiles
    if (!p || p.id === myId) continue
    seen.set(p.id, { id: p.id, name: p.full_name ?? p.email ?? 'Unknown', email: p.email ?? '' })
  }
  return [...seen.values()]
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Look up anyone with a Remindly account by name, email or user ID.
 * Requires at least 3 characters so the whole user base can't be enumerated
 * from a single keystroke, and caps results.
 */
export async function searchUsers(query: string, myId: string): Promise<DirectoryUser[]> {
  if (!supabase) return []
  const q = query.trim()
  if (q.length < 3) return []

  const req = supabase.from('profiles').select('id, full_name, email').neq('id', myId).limit(8)
  const { data, error } = UUID_RE.test(q)
    ? await req.eq('id', q)
    : await req.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)

  if (error) return []
  return ((data ?? []) as { id: string; full_name: string | null; email: string | null }[]).map(p => ({
    id: p.id,
    name: p.full_name ?? p.email ?? 'Unknown',
    email: p.email ?? '',
  }))
}

export async function fetchInvoices(myId: string): Promise<Invoice[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('invoices')
    .select(SELECT)
    .or(`sender_id.eq.${myId},recipient_id.eq.${myId}`)
    .order('created_at', { ascending: false })
  if (error) throw new Error(readable(error.message))
  return ((data ?? []) as unknown as InvoiceRow[]).map(r => toInvoice(r, myId))
}

export interface CreateArgs {
  recipientId: string
  amountCents: number
  currency: string
  description: string
  dueDate: string
  lineItems: LineItem[]
}

export async function createInvoiceDb(myId: string, args: CreateArgs): Promise<string | null> {
  if (!supabase) return 'No database connection.'
  const { count } = await supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('sender_id', myId)

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      number: `INV-${1001 + (count ?? 0)}`,
      sender_id: myId,
      recipient_id: args.recipientId,
      amount_cents: args.amountCents,
      currency: args.currency,
      description: args.description,
      line_items: args.lineItems,
      due_date: args.dueDate,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) return readable(error.message)

  await supabase.from('invoice_events').insert([
    { invoice_id: data.id, actor_id: myId, action: 'created' },
    { invoice_id: data.id, actor_id: myId, action: 'sent' },
  ])
  return null
}

async function transition(
  myId: string,
  invoiceId: string,
  status: 'paid' | 'rejected' | 'cancelled',
  comment: string | undefined,
  action: InvoiceAction,
): Promise<string | null> {
  if (!supabase) return 'No database connection.'
  // `eq('status','sent')` makes this a compare-and-set: a second concurrent
  // action matches 0 rows instead of overwriting the first.
  const { data, error } = await supabase
    .from('invoices')
    .update({ status, resolution_comment: comment ?? null })
    .eq('id', invoiceId)
    .eq('status', 'sent')
    .select('id')
  if (error) return readable(error.message)
  if (!data || data.length === 0) return 'This invoice was already resolved.'

  await supabase.from('invoice_events').insert({
    invoice_id: invoiceId,
    actor_id: myId,
    action,
    comment: comment ?? null,
  })
  return null
}

export const markPaidDb = (myId: string, id: string, comment: string) =>
  transition(myId, id, 'paid', comment.trim() || undefined, 'paid')

export const rejectDb = (myId: string, id: string, comment: string) =>
  transition(myId, id, 'rejected', comment.trim(), 'rejected')

export const cancelDb = (myId: string, id: string) => transition(myId, id, 'cancelled', undefined, 'cancelled')

export async function addCommentDb(myId: string, invoiceId: string, comment: string): Promise<string | null> {
  if (!supabase) return 'No database connection.'
  const { error } = await supabase
    .from('invoice_events')
    .insert({ invoice_id: invoiceId, actor_id: myId, action: 'commented', comment: comment.trim() })
  return error ? readable(error.message) : null
}
