import { useCallback, useSyncExternalStore } from 'react'
import { makeStore } from './localStore'

/**
 * Business track: staff certifications, contract lifecycle and finance filing
 * deadlines — plus the group compliance policy that drives escalation.
 *
 * Local-first like the rest of the app: usable immediately, and mirrored to the
 * tables in 0006_business_compliance.sql once wired to a signed-in account.
 */

const DAY = 86400000
const pad = (n: number) => String(n).padStart(2, '0')
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1)
  dt.setHours(0, 0, 0, 0)
  return dt
}
export const daysUntil = (s: string) => {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return Math.round((parseDate(s).getTime() - t.getTime()) / DAY)
}
/**
 * Add or subtract whole days using calendar arithmetic.
 * Millisecond maths silently loses or gains an hour across a daylight-saving
 * boundary, which is enough to shift the result by a full day.
 */
export function addCalendarDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

const shift = (days: number) => addCalendarDays(isoDate(new Date()), days)
export const fmtDate = (s: string) =>
  new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(parseDate(s))

export type Health = 'valid' | 'expiring' | 'expired'

/** Traffic light shared by certifications, contracts and filings. */
export function healthOf(dateStr: string, warnDays = 30): Health {
  const d = daysUntil(dateStr)
  if (d < 0) return 'expired'
  if (d <= warnDays) return 'expiring'
  return 'valid'
}

export const HEALTH_STYLE: Record<Health, string> = {
  valid: 'bg-[rgba(45,212,191,0.18)] text-[#7BE9D8]',
  expiring: 'bg-[rgba(251,191,36,0.18)] text-[#FCD770]',
  expired: 'bg-[rgba(255,107,107,0.18)] text-[#FFB4B4]',
}

// ---------------------------------------------------------------------------
// Certifications (TASK-301)
// ---------------------------------------------------------------------------
export interface Certification {
  id: string
  staffName: string
  certType: string
  issuedDate?: string
  expiryDate: string
  groupName?: string
}

export const CERT_TYPES = ['Forklift licence', 'First aid', 'Food safety', 'Working at heights', 'Site safety induction', 'Other']

const certStore = makeStore<Certification[]>('remindly.certs.v1', [
  { id: 'c1', staffName: 'Tama Wright', certType: 'Forklift licence', expiryDate: shift(24), groupName: 'Acme · Site A crew' },
  { id: 'c2', staffName: 'Sione Vaka', certType: 'First aid', expiryDate: shift(96), groupName: 'Acme · Site A crew' },
  { id: 'c3', staffName: 'Priya Nair', certType: 'Site safety induction', expiryDate: shift(-6), groupName: 'Acme · Site A crew' },
])

export function useCertifications() {
  const items = useSyncExternalStore(certStore.subscribe, certStore.get, certStore.get)
  const add = useCallback((c: Omit<Certification, 'id'>) => {
    if (!c.staffName.trim() || !c.expiryDate) return false
    certStore.set([{ ...c, id: `cert-${Date.now()}` }, ...certStore.get()])
    return true
  }, [])
  const remove = useCallback((id: string) => certStore.set(certStore.get().filter(c => c.id !== id)), [])
  const sorted = [...items].sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate))
  const expired = sorted.filter(c => healthOf(c.expiryDate) === 'expired')
  return { items: sorted, expired, add, remove }
}

// ---------------------------------------------------------------------------
// Contracts (TASK-302)
// ---------------------------------------------------------------------------
export interface Contract {
  id: string
  counterparty: string
  contractType?: string
  endDate: string
  noticePeriodDays: number
  autoRenew: boolean
}

/** The date by which notice must be given — end date minus the notice period. */
export function noticeDeadline(c: Contract): string {
  return addCalendarDays(c.endDate, -c.noticePeriodDays)
}

const contractStore = makeStore<Contract[]>('remindly.contracts.v1', [
  { id: 'k1', counterparty: 'Fletcher Supplies', contractType: 'Materials', endDate: shift(75), noticePeriodDays: 60, autoRenew: true },
  { id: 'k2', counterparty: 'Northline Logistics', contractType: 'Freight', endDate: shift(210), noticePeriodDays: 30, autoRenew: false },
])

export function useContracts() {
  const items = useSyncExternalStore(contractStore.subscribe, contractStore.get, contractStore.get)
  const add = useCallback((c: Omit<Contract, 'id'>) => {
    if (!c.counterparty.trim() || !c.endDate) return false
    contractStore.set([{ ...c, id: `ct-${Date.now()}` }, ...contractStore.get()])
    return true
  }, [])
  const remove = useCallback((id: string) => contractStore.set(contractStore.get().filter(c => c.id !== id)), [])
  const sorted = [...items].sort((a, b) => daysUntil(noticeDeadline(a)) - daysUntil(noticeDeadline(b)))
  // Auto-renewing contracts still need a decision, so they still raise notice.
  const noticeDue = sorted.filter(c => daysUntil(noticeDeadline(c)) <= 30)
  return { items: sorted, noticeDue, add, remove }
}

// ---------------------------------------------------------------------------
// Finance deadlines (TASK-303) — NZ IRD defaults
// ---------------------------------------------------------------------------
export type FilingType = 'gst_filing' | 'paye_filing' | 'invoice_due' | 'custom'

export interface FinanceDeadline {
  id: string
  label: string
  type: FilingType
  dueDate: string
  amountCents?: number
  recurrenceMonths: number
}

export const FILING_PRESETS: { type: FilingType; label: string; recurrenceMonths: number; hint: string }[] = [
  { type: 'gst_filing', label: 'GST return', recurrenceMonths: 2, hint: 'IRD default: every 2 months' },
  { type: 'paye_filing', label: 'PAYE filing', recurrenceMonths: 1, hint: 'Monthly' },
  { type: 'invoice_due', label: 'Invoice due', recurrenceMonths: 0, hint: 'One-off' },
  { type: 'custom', label: 'Custom', recurrenceMonths: 0, hint: 'One-off' },
]

/** Roll a past due date forward by its recurrence until it is in the future. */
export function nextDue(d: FinanceDeadline): string {
  if (d.recurrenceMonths <= 0) return d.dueDate
  const date = parseDate(d.dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let guard = 0
  while (date.getTime() < today.getTime() && guard < 120) {
    date.setMonth(date.getMonth() + d.recurrenceMonths)
    guard++
  }
  return isoDate(date)
}

const financeStore = makeStore<FinanceDeadline[]>('remindly.finance.v1', [
  { id: 'f1', label: 'GST return', type: 'gst_filing', dueDate: shift(12), recurrenceMonths: 2 },
  { id: 'f2', label: 'PAYE filing', type: 'paye_filing', dueDate: shift(4), recurrenceMonths: 1 },
])

export function useFinanceDeadlines() {
  const items = useSyncExternalStore(financeStore.subscribe, financeStore.get, financeStore.get)
  const add = useCallback((d: Omit<FinanceDeadline, 'id'>) => {
    if (!d.label.trim() || !d.dueDate) return false
    financeStore.set([{ ...d, id: `fd-${Date.now()}` }, ...financeStore.get()])
    return true
  }, [])
  const remove = useCallback((id: string) => financeStore.set(financeStore.get().filter(d => d.id !== id)), [])
  const sorted = [...items].sort((a, b) => daysUntil(nextDue(a)) - daysUntil(nextDue(b)))
  return { items: sorted, add, remove }
}

// ---------------------------------------------------------------------------
// Group compliance policy + escalations (slices 2 & 3)
// ---------------------------------------------------------------------------
export interface GroupPolicy {
  groupId: string
  groupName: string
  complianceEnabled: boolean
  escalateAfterHours: number
  secondHopHours: number
  defaultLeadMinutes: number
  membersMayCreate: boolean
}

export interface Escalation {
  id: string
  reminderTitle: string
  groupName: string
  subjectName: string
  stage: 'group_admin' | 'super_admin' | 'resolved'
  raisedAt: string
  note?: string
}

const policyStore = makeStore<GroupPolicy[]>('remindly.policies.v1', [
  { groupId: 'g1', groupName: 'Acme · Site A crew', complianceEnabled: true, escalateAfterHours: 2, secondHopHours: 24, defaultLeadMinutes: 60, membersMayCreate: false },
  { groupId: 'g2', groupName: 'Wellington Rugby', complianceEnabled: false, escalateAfterHours: 6, secondHopHours: 48, defaultLeadMinutes: 60, membersMayCreate: true },
])

const escalationStore = makeStore<Escalation[]>('remindly.escalations.v1', [
  {
    id: 'e1',
    reminderTitle: 'Submit weekly safety checklist',
    groupName: 'Acme · Site A crew',
    subjectName: 'Tama Wright',
    stage: 'group_admin',
    raisedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
  },
])

export function useCompliance() {
  const policies = useSyncExternalStore(policyStore.subscribe, policyStore.get, policyStore.get)
  const escalations = useSyncExternalStore(escalationStore.subscribe, escalationStore.get, escalationStore.get)

  const updatePolicy = useCallback((groupId: string, patch: Partial<GroupPolicy>) => {
    policyStore.set(policyStore.get().map(p => (p.groupId === groupId ? { ...p, ...patch } : p)))
  }, [])

  const resolveEscalation = useCallback((id: string, note?: string) => {
    escalationStore.set(escalationStore.get().map(e => (e.id === id ? { ...e, stage: 'resolved' as const, note } : e)))
  }, [])

  /** Move an unresolved escalation up the chain to a Super Admin. */
  const escalateFurther = useCallback((id: string) => {
    escalationStore.set(escalationStore.get().map(e => (e.id === id ? { ...e, stage: 'super_admin' as const } : e)))
  }, [])

  const open = escalations.filter(e => e.stage !== 'resolved')
  return { policies, escalations, open, updatePolicy, resolveEscalation, escalateFurther }
}
