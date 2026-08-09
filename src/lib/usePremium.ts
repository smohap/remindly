import { useCallback, useSyncExternalStore } from 'react'
import { makeSyncedStore } from './syncedStore'

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr + 'T00:00:00'))
}

// ===========================================================================
// TASK-202 — Renewal Vault
// ===========================================================================
export type VaultType = 'passport' | 'drivers_licence' | 'vehicle_rego_wof' | 'insurance_policy' | 'warranty' | 'other'

export interface VaultItem {
  id: string
  itemType: VaultType
  label: string
  expiryDate: string // YYYY-MM-DD
  leadTimeDays: number
}

export const VAULT_TYPES: { value: VaultType; label: string; icon: string; defaultLead: number }[] = [
  { value: 'passport', label: 'Passport', icon: '🛂', defaultLead: 180 },
  { value: 'drivers_licence', label: "Driver's licence", icon: '🪪', defaultLead: 60 },
  { value: 'vehicle_rego_wof', label: 'Vehicle rego / WOF', icon: '🚗', defaultLead: 30 },
  { value: 'insurance_policy', label: 'Insurance policy', icon: '🛡️', defaultLead: 30 },
  { value: 'warranty', label: 'Warranty', icon: '🧾', defaultLead: 14 },
  { value: 'other', label: 'Other', icon: '📄', defaultLead: 30 },
]

export function vaultMeta(type: VaultType) {
  return VAULT_TYPES.find(t => t.value === type) ?? VAULT_TYPES[VAULT_TYPES.length - 1]
}

const vaultSeed: VaultItem[] = [
  { id: 'v1', itemType: 'passport', label: 'NZ Passport', expiryDate: daysFromNow(150), leadTimeDays: 180 },
  { id: 'v2', itemType: 'vehicle_rego_wof', label: 'Toyota Corolla — WOF', expiryDate: daysFromNow(21), leadTimeDays: 30 },
  { id: 'v3', itemType: 'insurance_policy', label: 'Contents insurance', expiryDate: daysFromNow(64), leadTimeDays: 30 },
]

const vaultStore = makeSyncedStore<VaultItem>({
  key: 'remindly.vault.v1',
  table: 'renewal_items',
  orderBy: { column: 'expiry_date', ascending: true },
  toRow: v => ({ item_type: v.itemType, label: v.label, expiry_date: v.expiryDate, lead_time_days: v.leadTimeDays }),
  fromRow: r => ({
    id: String(r.id),
    itemType: (r.item_type as VaultType) ?? 'other',
    label: String(r.label ?? ''),
    expiryDate: String(r.expiry_date ?? new Date().toISOString().slice(0, 10)),
    leadTimeDays: Number(r.lead_time_days ?? 30),
  }),
  seed: vaultSeed,
})

export function useVault() {
  const items = useSyncExternalStore(vaultStore.subscribe, vaultStore.get, vaultStore.get)
  const add = useCallback((item: Omit<VaultItem, 'id'>) => {
    vaultStore.set([{ ...item, id: `v-${Date.now()}` }, ...vaultStore.get()])
  }, [])
  const remove = useCallback((id: string) => {
    vaultStore.set(vaultStore.get().filter(i => i.id !== id))
  }, [])
  const sorted = [...items].sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate))
  return { items: sorted, add, remove }
}

// ===========================================================================
// TASK-201 — Subscription tracker (manual entry only)
// ===========================================================================
export type Cycle = 'weekly' | 'monthly' | 'yearly'

export interface Subscription {
  id: string
  merchantName: string
  amountCents: number
  currency: string
  cycle: Cycle
  nextChargeDate: string // YYYY-MM-DD
  leadTimeDays: number
}

/** Roll a possibly-past charge date forward to the next future occurrence. */
export function nextOccurrence(dateStr: string, cycle: Cycle): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let guard = 0
  while (d.getTime() < today.getTime() && guard < 600) {
    if (cycle === 'weekly') d.setDate(d.getDate() + 7)
    else if (cycle === 'monthly') d.setMonth(d.getMonth() + 1)
    else d.setFullYear(d.getFullYear() + 1)
    guard++
  }
  return d.toISOString().slice(0, 10)
}

/** Normalise any cycle to a monthly cost in cents. */
export function monthlyCents(sub: Subscription): number {
  if (sub.cycle === 'monthly') return sub.amountCents
  if (sub.cycle === 'yearly') return Math.round(sub.amountCents / 12)
  return Math.round((sub.amountCents * 52) / 12)
}

export function formatMoney(cents: number, currency = 'NZD'): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency, maximumFractionDigits: 2 }).format(cents / 100)
}

const subSeed: Subscription[] = [
  { id: 's1', merchantName: 'Netflix', amountCents: 2599, currency: 'NZD', cycle: 'monthly', nextChargeDate: daysFromNow(9), leadTimeDays: 3 },
  { id: 's2', merchantName: 'iCloud+ 200GB', amountCents: 499, currency: 'NZD', cycle: 'monthly', nextChargeDate: daysFromNow(2), leadTimeDays: 3 },
  { id: 's3', merchantName: 'Les Mills gym', amountCents: 89900, currency: 'NZD', cycle: 'yearly', nextChargeDate: daysFromNow(120), leadTimeDays: 3 },
]

const subStore = makeSyncedStore<Subscription>({
  key: 'remindly.subs.v1',
  table: 'tracked_subscriptions',
  orderBy: { column: 'next_charge_date', ascending: true },
  toRow: s => ({
    merchant_name: s.merchantName,
    amount_cents: s.amountCents,
    currency: s.currency,
    cycle: s.cycle,
    next_charge_date: s.nextChargeDate,
    lead_time_days: s.leadTimeDays,
  }),
  fromRow: r => ({
    id: String(r.id),
    merchantName: String(r.merchant_name ?? ''),
    amountCents: Number(r.amount_cents ?? 0),
    currency: String(r.currency ?? 'NZD'),
    cycle: (r.cycle as Cycle) ?? 'monthly',
    nextChargeDate: String(r.next_charge_date ?? new Date().toISOString().slice(0, 10)),
    leadTimeDays: Number(r.lead_time_days ?? 3),
  }),
  seed: subSeed,
})

/** Hydrate the vault and subscription collections for a signed-in user. */
export async function hydratePremium(uid: string) {
  await Promise.all([vaultStore.hydrate(uid), subStore.hydrate(uid)])
}

export function useSubscriptions() {
  const subs = useSyncExternalStore(subStore.subscribe, subStore.get, subStore.get)
  const add = useCallback((sub: Omit<Subscription, 'id'>) => {
    subStore.set([{ ...sub, id: `s-${Date.now()}` }, ...subStore.get()])
  }, [])
  const remove = useCallback((id: string) => {
    subStore.set(subStore.get().filter(s => s.id !== id))
  }, [])
  const sorted = [...subs].sort((a, b) => daysUntil(nextOccurrence(a.nextChargeDate, a.cycle)) - daysUntil(nextOccurrence(b.nextChargeDate, b.cycle)))
  const monthlyTotal = subs.reduce((sum, s) => sum + monthlyCents(s), 0)
  const currency = subs[0]?.currency ?? 'NZD'
  return { subs: sorted, add, remove, monthlyTotal, yearlyTotal: monthlyTotal * 12, currency }
}
