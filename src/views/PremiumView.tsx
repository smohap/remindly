import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarClock, Gift, Plus, ShieldCheck, Sparkles, Trash2, Wallet, X } from 'lucide-react'
import { cn } from '../lib/cn'
import { PremiumGate } from '../components/PremiumGate'
import {
  VAULT_TYPES,
  daysUntil,
  formatDate,
  formatMoney,
  monthlyCents,
  nextOccurrence,
  useSubscriptions,
  useVault,
  vaultMeta,
  type Cycle,
  type VaultType,
} from '../lib/usePremium'

type Segment = 'vault' | 'subscriptions' | 'concierge' | 'business'

const SEGMENTS: { key: Segment; label: string; icon: typeof Wallet; locked?: boolean }[] = [
  { key: 'vault', label: 'Renewal Vault', icon: ShieldCheck },
  { key: 'subscriptions', label: 'Subscriptions', icon: Wallet },
  { key: 'concierge', label: 'Gift Concierge', icon: Gift, locked: true },
  { key: 'business', label: 'Business', icon: CalendarClock, locked: true },
]

const fieldClass =
  'w-full rounded-[12px] border border-[color:var(--glass-border)] bg-white/[0.08] px-3.5 py-2.5 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)] md:text-[0.85rem]'
const labelClass = 'mb-1.5 block text-[0.72rem] font-semibold text-[color:var(--ink-dim)]'

function CountdownChip({ days }: { days: number }) {
  const { text, cls } =
    days < 0
      ? { text: 'Expired', cls: 'bg-[rgba(255,107,107,0.18)] text-[#FFB4B4]' }
      : days < 30
        ? { text: `${days}d left`, cls: 'bg-[rgba(255,107,107,0.18)] text-[#FFB4B4]' }
        : days <= 90
          ? { text: `${days}d left`, cls: 'bg-[rgba(251,191,36,0.18)] text-[#FCD770]' }
          : { text: `${days}d left`, cls: 'bg-[rgba(45,212,191,0.18)] text-[#7BE9D8]' }
  return <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-bold', cls)}>{text}</span>
}

function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="glass flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="text-3xl" aria-hidden>{icon}</span>
      <h3 className="font-display text-[0.95rem] font-bold">{title}</h3>
      <p className="max-w-xs text-[0.8rem] text-[color:var(--ink-dim)]">{text}</p>
    </div>
  )
}

// --------------------------------------------------------------------------
// TASK-202 — Renewal Vault
// --------------------------------------------------------------------------
function VaultSection() {
  const { items, add, remove } = useVault()
  const [open, setOpen] = useState(false)
  const [itemType, setItemType] = useState<VaultType>('passport')
  const [label, setLabel] = useState('')
  const [expiryDate, setExpiryDate] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim() || !expiryDate) return
    add({ itemType, label: label.trim(), expiryDate, leadTimeDays: vaultMeta(itemType).defaultLead })
    setLabel('')
    setExpiryDate('')
    setItemType('passport')
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[0.8rem] text-[color:var(--ink-dim)]">Track expiries for documents and policies — reminders fire ahead of each renewal.</p>
        <button onClick={() => setOpen(v => !v)} className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-3.5 py-2 text-[0.78rem] font-bold text-[#1a1240] transition hover:brightness-110">
          <Plus size={15} /> Add item
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={submit}
            className="glass overflow-hidden"
          >
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Type</label>
                <select value={itemType} onChange={e => setItemType(e.target.value as VaultType)} className={fieldClass}>
                  {VAULT_TYPES.map(t => (
                    <option key={t.value} value={t.value} className="bg-[color:var(--indigo)]">{t.icon} {t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Expiry date</label>
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} required className={fieldClass} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Label</label>
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. NZ Passport" required className={fieldClass} />
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" className="flex-1 cursor-pointer rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] py-2.5 text-[0.82rem] font-bold text-[#1a1240]">Save to vault</button>
                <button type="button" onClick={() => setOpen(false)} className="cursor-pointer rounded-full border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-2.5 text-[0.82rem] font-semibold text-[color:var(--ink-dim)]">Cancel</button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {items.length === 0 ? (
        <EmptyState icon="🗄️" title="Your vault is empty" text="Add a passport, licence, WOF or policy and Remindly will remind you before it expires." />
      ) : (
        items.map(item => {
          const meta = vaultMeta(item.itemType)
          const d = daysUntil(item.expiryDate)
          return (
            <div key={item.id} className="glass group flex items-center gap-3.5 px-[18px] py-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-[1.15rem]" aria-hidden>{meta.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.9rem] font-bold">{item.label}</div>
                <div className="text-[0.74rem] text-[color:var(--ink-faint)]">{meta.label} · expires {formatDate(item.expiryDate)}</div>
              </div>
              <CountdownChip days={d} />
              <button onClick={() => remove(item.id)} aria-label={`Remove ${item.label}`} className="shrink-0 cursor-pointer text-[color:var(--ink-faint)] opacity-0 transition hover:text-[color:var(--red)] group-hover:opacity-100">
                <Trash2 size={15} />
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}

// --------------------------------------------------------------------------
// TASK-201 — Subscription tracker
// --------------------------------------------------------------------------
function SubscriptionsSection() {
  const { subs, add, remove, monthlyTotal, yearlyTotal, currency } = useSubscriptions()
  const [open, setOpen] = useState(false)
  const [merchantName, setMerchantName] = useState('')
  const [amount, setAmount] = useState('')
  const [cycle, setCycle] = useState<Cycle>('monthly')
  const [nextChargeDate, setNextChargeDate] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const cents = Math.round(parseFloat(amount) * 100)
    if (!merchantName.trim() || !cents || !nextChargeDate) return
    add({ merchantName: merchantName.trim(), amountCents: cents, currency: 'NZD', cycle, nextChargeDate, leadTimeDays: 3 })
    setMerchantName('')
    setAmount('')
    setCycle('monthly')
    setNextChargeDate('')
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="glass flex items-center justify-between p-5">
        <div>
          <div className="text-[0.7rem] uppercase tracking-[0.08em] text-[color:var(--ink-faint)]">Total spend</div>
          <div className="font-display text-[1.6rem] font-extrabold leading-tight">{formatMoney(monthlyTotal, currency)}<span className="text-[0.8rem] font-semibold text-[color:var(--ink-dim)]">/mo</span></div>
          <div className="text-[0.74rem] text-[color:var(--ink-faint)]">{formatMoney(yearlyTotal, currency)} per year · {subs.length} active</div>
        </div>
        <button onClick={() => setOpen(v => !v)} className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-3.5 py-2 text-[0.78rem] font-bold text-[#1a1240] transition hover:brightness-110">
          <Plus size={15} /> Add
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={submit} className="glass overflow-hidden">
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Merchant</label>
                <input value={merchantName} onChange={e => setMerchantName(e.target.value)} placeholder="e.g. Spotify" required className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Amount (NZD)</label>
                <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="12.99" required className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Billing cycle</label>
                <select value={cycle} onChange={e => setCycle(e.target.value as Cycle)} className={fieldClass}>
                  <option value="weekly" className="bg-[color:var(--indigo)]">Weekly</option>
                  <option value="monthly" className="bg-[color:var(--indigo)]">Monthly</option>
                  <option value="yearly" className="bg-[color:var(--indigo)]">Yearly</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Next charge date</label>
                <input type="date" value={nextChargeDate} onChange={e => setNextChargeDate(e.target.value)} required className={fieldClass} />
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" className="flex-1 cursor-pointer rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] py-2.5 text-[0.82rem] font-bold text-[#1a1240]">Track subscription</button>
                <button type="button" onClick={() => setOpen(false)} className="cursor-pointer rounded-full border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-2.5 text-[0.82rem] font-semibold text-[color:var(--ink-dim)]">Cancel</button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {subs.length === 0 ? (
        <EmptyState icon="💳" title="No subscriptions tracked" text="Add your recurring payments to see total spend and get a reminder before each charge." />
      ) : (
        subs.map(sub => {
          const charge = nextOccurrence(sub.nextChargeDate, sub.cycle)
          const d = daysUntil(charge)
          return (
            <div key={sub.id} className="glass group flex items-center gap-3.5 px-[18px] py-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-[0.8rem] font-bold" aria-hidden>{sub.merchantName.slice(0, 2).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.9rem] font-bold">{sub.merchantName}</div>
                <div className="text-[0.74rem] text-[color:var(--ink-faint)]">
                  {formatMoney(sub.amountCents, sub.currency)}/{sub.cycle === 'monthly' ? 'mo' : sub.cycle === 'yearly' ? 'yr' : 'wk'} · next {formatDate(charge)} · {formatMoney(monthlyCents(sub), sub.currency)}/mo
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-white/[0.1] px-2.5 py-1 text-[0.68rem] font-bold text-[color:var(--ink-dim)]">{d}d</span>
              <button onClick={() => remove(sub.id)} aria-label={`Remove ${sub.merchantName}`} className="shrink-0 cursor-pointer text-[color:var(--ink-faint)] opacity-0 transition hover:text-[color:var(--red)] group-hover:opacity-100">
                <X size={16} />
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}

// --------------------------------------------------------------------------
// Locked previews (backend-dependent tracks)
// --------------------------------------------------------------------------
function ConciergeLocked() {
  return (
    <PremiumGate
      title="Gift & Occasion Concierge"
      description="AI gift ideas tuned to the recipient, budget and time left — plus one-tap ordering and e-gift cards. Connects to partner marketplaces."
      preview={
        <div className="flex flex-col gap-3">
          {['Handmade ceramic vase — $45–60', 'Same-day flowers, native bouquet — $70', 'Digital e-gift card — instant'].map(t => (
            <div key={t} className="glass flex items-center gap-3 px-[18px] py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/10 text-lg">🎁</span>
              <div className="text-[0.9rem] font-bold">{t}</div>
            </div>
          ))}
        </div>
      }
    />
  )
}

function BusinessLocked() {
  return (
    <PremiumGate
      title="Business compliance suite"
      description="Certification & licence tracking, contract lifecycle reminders, and NZ GST/PAYE filing deadlines — with escalation to admins."
      preview={
        <div className="flex flex-col gap-3">
          {['Forklift licence — expires in 24 days', 'Supplier contract — notice due in 40 days', 'GST filing — due 28th'].map(t => (
            <div key={t} className="glass flex items-center gap-3 px-[18px] py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/10 text-lg">📋</span>
              <div className="text-[0.9rem] font-bold">{t}</div>
            </div>
          ))}
        </div>
      }
    />
  )
}

// --------------------------------------------------------------------------
export function PremiumView() {
  const [segment, setSegment] = useState<Segment>('vault')
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] text-[#1a1240]">
          <Sparkles size={16} />
        </span>
        <div>
          <h2 className="font-display text-[1.05rem] font-bold leading-none">Premium</h2>
          <p className="text-[0.74rem] text-[color:var(--ink-dim)]">Renewals, subscriptions, gifting and business tools</p>
        </div>
      </div>

      <div className="scrollbar-hidden -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {SEGMENTS.map(s => {
          const active = segment === s.key
          return (
            <button
              key={s.key}
              onClick={() => setSegment(s.key)}
              className={cn(
                'relative flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.78rem] font-semibold transition-colors',
                active ? 'text-white' : 'text-[color:var(--ink-faint)] hover:text-[color:var(--ink-dim)]',
              )}
            >
              {active && <motion.span layoutId="prem-seg" className="absolute inset-0 rounded-full bg-[color:var(--glass-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
              <span className="relative flex items-center gap-1.5">
                <s.icon size={14} /> {s.label}
                {s.locked && <span className="text-[0.62rem]">🔒</span>}
              </span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={segment} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
          {segment === 'vault' && <VaultSection />}
          {segment === 'subscriptions' && <SubscriptionsSection />}
          {segment === 'concierge' && <ConciergeLocked />}
          {segment === 'business' && <BusinessLocked />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
