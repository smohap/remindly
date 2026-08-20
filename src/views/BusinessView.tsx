import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, BadgeCheck, FileSignature, Landmark, Lock, Plus, Trash2 } from 'lucide-react'
import { cn } from '../lib/cn'
import { usePremium } from '../lib/useWorkspace'
import {
  CERT_TYPES, FILING_PRESETS, HEALTH_STYLE,
  daysUntil, fmtDate, healthOf, isoDate, nextDue, noticeDeadline,
  useCertifications, useContracts, useFinanceDeadlines,
  type FilingType,
} from '../lib/useBusiness'

type Tab = 'certs' | 'contracts' | 'finance'

const field =
  'w-full rounded-[12px] border border-[color:var(--glass-border)] bg-white/[0.08] px-3.5 py-2.5 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)] md:text-[0.85rem]'
const labelCls = 'mb-1.5 block text-[0.72rem] font-semibold text-[color:var(--ink-dim)]'
const primaryBtn =
  'cursor-pointer rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-4 py-2.5 text-[0.8rem] font-bold text-[#1a1240] transition hover:brightness-110'

function Chip({ date, warnDays = 30 }: { date: string; warnDays?: number }) {
  const h = healthOf(date, warnDays)
  const d = daysUntil(date)
  const text = d < 0 ? `${Math.abs(d)}d overdue` : `${d}d left`
  return <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[0.66rem] font-bold', HEALTH_STYLE[h])}>{text}</span>
}

export function BusinessView() {
  const { isPremium, setPremium } = usePremium()
  const [tab, setTab] = useState<Tab>('certs')
  const certs = useCertifications()
  const contracts = useContracts()

  if (!isPremium) {
    return (
      <div className="glass flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] text-[#1a1240]">
          <Lock size={20} />
        </span>
        <h3 className="font-display text-[1.15rem] font-bold">Business compliance suite</h3>
        <p className="max-w-md text-[0.85rem] leading-relaxed text-[color:var(--ink-dim)]">
          Track staff certifications, contract notice periods and GST/PAYE filing deadlines — with reminders that reach
          both the person responsible and their admin. Available on Team, Growth and Enterprise plans.
        </p>
        <button onClick={() => setPremium(true)} className={primaryBtn}>Unlock Premium</button>
      </div>
    )
  }

  const TABS: { key: Tab; label: string; icon: typeof BadgeCheck; alert: number }[] = [
    { key: 'certs', label: 'Certifications', icon: BadgeCheck, alert: certs.expired.length },
    { key: 'contracts', label: 'Contracts', icon: FileSignature, alert: contracts.noticeDue.length },
    { key: 'finance', label: 'Filings', icon: Landmark, alert: 0 },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-[1.05rem] font-bold">Business</h2>
        <p className="text-[0.78rem] text-[color:var(--ink-dim)]">Certifications, contract lifecycle and filing deadlines.</p>
      </div>

      {certs.expired.length > 0 && (
        <div className="glass flex items-start gap-2.5 px-[18px] py-3 text-[0.78rem]">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[color:var(--red)]" />
          <span>
            <b>{certs.expired.length} expired certification{certs.expired.length === 1 ? '' : 's'}.</b>{' '}
            <span className="text-[color:var(--ink-dim)]">
              Staff with an expired certification are blocked from compliance assignments until it is renewed.
            </span>
          </span>
        </div>
      )}

      <div className="scrollbar-hidden -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'relative flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.78rem] font-semibold transition-colors',
                active ? 'text-white' : 'text-[color:var(--ink-faint)] hover:text-[color:var(--ink-dim)]',
              )}
            >
              {active && (
                <motion.span
                  layoutId="biz-tab"
                  className="absolute inset-0 rounded-full bg-[color:var(--glass-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                <t.icon size={14} /> {t.label}
                {t.alert > 0 && (
                  <span className="rounded-full bg-[rgba(255,107,107,0.25)] px-1.5 text-[0.6rem] font-extrabold text-[#FFB4B4]">{t.alert}</span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.16 }}>
          {tab === 'certs' && <CertsTab />}
          {tab === 'contracts' && <ContractsTab />}
          {tab === 'finance' && <FinanceTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
function CertsTab() {
  const { items, add, remove } = useCertifications()
  const [open, setOpen] = useState(false)
  const [staffName, setStaffName] = useState('')
  const [certType, setCertType] = useState(CERT_TYPES[0])
  const [expiryDate, setExpiryDate] = useState('')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[0.78rem] text-[color:var(--ink-dim)]">Reminders fire 60, 30 and 7 days before expiry — to the staff member and their admin.</p>
        <button onClick={() => setOpen(v => !v)} className={cn(primaryBtn, 'flex shrink-0 items-center gap-1.5')}>
          <Plus size={15} /> Add
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={e => {
              e.preventDefault()
              if (add({ staffName, certType, expiryDate })) {
                setStaffName('')
                setExpiryDate('')
                setOpen(false)
              }
            }}
            className="glass overflow-hidden"
          >
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Staff member</label>
                <input autoFocus value={staffName} onChange={e => setStaffName(e.target.value)} placeholder="Name" required className={field} />
              </div>
              <div>
                <label className={labelCls}>Certification</label>
                <select value={certType} onChange={e => setCertType(e.target.value)} className={field}>
                  {CERT_TYPES.map(t => (
                    <option key={t} value={t} className="bg-[color:var(--indigo)]">{t}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Expires</label>
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} required className={field} />
              </div>
              <button type="submit" className={cn(primaryBtn, 'sm:col-span-2')}>Save certification</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {items.length === 0 && <div className="glass px-6 py-10 text-center text-[0.82rem] text-[color:var(--ink-dim)]">No certifications tracked yet.</div>}

      {items.map(c => (
        <div key={c.id} className="glass group flex items-center gap-3.5 px-[18px] py-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-base">🎓</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[0.9rem] font-bold">{c.staffName}</div>
            <div className="truncate text-[0.74rem] text-[color:var(--ink-faint)]">
              {c.certType} · expires {fmtDate(c.expiryDate)}
              {c.groupName ? ` · ${c.groupName}` : ''}
            </div>
          </div>
          <Chip date={c.expiryDate} warnDays={60} />
          <button
            onClick={() => remove(c.id)}
            aria-label={`Remove ${c.certType} for ${c.staffName}`}
            className="shrink-0 cursor-pointer text-[color:var(--ink-faint)] opacity-0 transition hover:text-[color:var(--red)] group-hover:opacity-100"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
function ContractsTab() {
  const { items, add, remove } = useContracts()
  const [open, setOpen] = useState(false)
  const [counterparty, setCounterparty] = useState('')
  const [endDate, setEndDate] = useState('')
  const [noticePeriodDays, setNotice] = useState(30)
  const [autoRenew, setAutoRenew] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[0.78rem] text-[color:var(--ink-dim)]">Two reminders per contract: the notice deadline, then expiry. Auto-renewing contracts still raise the decision.</p>
        <button onClick={() => setOpen(v => !v)} className={cn(primaryBtn, 'flex shrink-0 items-center gap-1.5')}>
          <Plus size={15} /> Add
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={e => {
              e.preventDefault()
              if (add({ counterparty, endDate, noticePeriodDays, autoRenew })) {
                setCounterparty('')
                setEndDate('')
                setOpen(false)
              }
            }}
            className="glass overflow-hidden"
          >
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Counterparty</label>
                <input autoFocus value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="e.g. Fletcher Supplies" required className={field} />
              </div>
              <div>
                <label className={labelCls}>Contract ends</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className={field} />
              </div>
              <div>
                <label className={labelCls}>Notice period (days)</label>
                <input type="number" min={0} max={365} value={noticePeriodDays} onChange={e => setNotice(Number(e.target.value))} className={field} />
              </div>
              <label className="flex items-center gap-2 text-[0.8rem] sm:col-span-2">
                <input type="checkbox" checked={autoRenew} onChange={e => setAutoRenew(e.target.checked)} className="accent-[color:var(--cyan)]" />
                Auto-renews unless notice is given
              </label>
              <button type="submit" className={cn(primaryBtn, 'sm:col-span-2')}>Save contract</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {items.length === 0 && <div className="glass px-6 py-10 text-center text-[0.82rem] text-[color:var(--ink-dim)]">No contracts tracked yet.</div>}

      {items.map(c => {
        const notice = noticeDeadline(c)
        return (
          <div key={c.id} className="glass group flex flex-col gap-2 px-[18px] py-3.5">
            <div className="flex items-center gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-base">📄</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[0.9rem] font-bold">{c.counterparty}</span>
                  {c.autoRenew && (
                    <span className="rounded-full bg-white/[0.14] px-2 py-[1px] text-[0.58rem] font-extrabold uppercase tracking-[0.05em] text-[color:var(--ink-dim)]">
                      Auto-renew
                    </span>
                  )}
                </div>
                <div className="truncate text-[0.74rem] text-[color:var(--ink-faint)]">
                  {c.contractType ? `${c.contractType} · ` : ''}ends {fmtDate(c.endDate)}
                </div>
              </div>
              <Chip date={notice} />
              <button
                onClick={() => remove(c.id)}
                aria-label={`Remove ${c.counterparty}`}
                className="shrink-0 cursor-pointer text-[color:var(--ink-faint)] opacity-0 transition hover:text-[color:var(--red)] group-hover:opacity-100"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div className="text-[0.72rem] text-[color:var(--ink-dim)]">
              Notice deadline <b>{fmtDate(notice)}</b> — {c.noticePeriodDays} days before it ends
              {c.autoRenew && <span className="text-[#FCD770]"> · renews automatically if you miss it</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
function FinanceTab() {
  const { items, add, remove } = useFinanceDeadlines()
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState<FilingType>('gst_filing')
  const [dueDate, setDueDate] = useState(isoDate(new Date()))

  const chosen = FILING_PRESETS.find(p => p.type === preset) ?? FILING_PRESETS[0]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[0.78rem] text-[color:var(--ink-dim)]">NZ IRD cycles are built in — GST every 2 months, PAYE monthly. Past dates roll forward automatically.</p>
        <button onClick={() => setOpen(v => !v)} className={cn(primaryBtn, 'flex shrink-0 items-center gap-1.5')}>
          <Plus size={15} /> Add
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={e => {
              e.preventDefault()
              if (add({ label: chosen.label, type: preset, dueDate, recurrenceMonths: chosen.recurrenceMonths })) setOpen(false)
            }}
            className="glass overflow-hidden"
          >
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Filing type</label>
                <select value={preset} onChange={e => setPreset(e.target.value as FilingType)} className={field}>
                  {FILING_PRESETS.map(p => (
                    <option key={p.type} value={p.type} className="bg-[color:var(--indigo)]">{p.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-[0.68rem] text-[color:var(--ink-faint)]">{chosen.hint}</p>
              </div>
              <div>
                <label className={labelCls}>First due date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className={field} />
              </div>
              <button type="submit" className={cn(primaryBtn, 'sm:col-span-2')}>Save deadline</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {items.length === 0 && <div className="glass px-6 py-10 text-center text-[0.82rem] text-[color:var(--ink-dim)]">No filing deadlines yet.</div>}

      {items.map(d => {
        const due = nextDue(d)
        return (
          <div key={d.id} className="glass group flex items-center gap-3.5 px-[18px] py-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-base">🧾</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.9rem] font-bold">{d.label}</div>
              <div className="truncate text-[0.74rem] text-[color:var(--ink-faint)]">
                Due {fmtDate(due)}
                {d.recurrenceMonths > 0 && ` · repeats every ${d.recurrenceMonths} month${d.recurrenceMonths === 1 ? '' : 's'}`}
              </div>
            </div>
            <Chip date={due} warnDays={14} />
            <button
              onClick={() => remove(d.id)}
              aria-label={`Remove ${d.label}`}
              className="shrink-0 cursor-pointer text-[color:var(--ink-faint)] opacity-0 transition hover:text-[color:var(--red)] group-hover:opacity-100"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
