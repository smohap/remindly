import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CreditCard, ExternalLink, LogOut, Moon, Sparkles, User } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { NotificationsCard } from '../components/NotificationsCard'
import { QuietHoursCard } from '../components/RailCards'
import { SegmentBar, useSegment } from '../components/SegmentBar'
import { isDemoBilling, openBillingPortal } from '../lib/billingClient'
import { PLANS, planLabel } from '../lib/plans'
import { usePlan } from '../lib/usePlan'
import { useStore } from '../store'
import { ProfileView } from './ProfileView'

const SEGMENTS = ['profile', 'billing', 'notifications'] as const

function PlanBillingCard() {
  const { plan, status, currentPeriodEnd, hasCustomer, loading } = usePlan()
  const { actions } = useStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const current = PLANS.find(p => p.id === plan)

  async function manage() {
    setBusy(true)
    setError(null)
    const r = await openBillingPortal()
    setBusy(false)
    if (r.ok && r.url) window.location.assign(r.url)
    else if (!r.ok) setError(r.message)
  }

  const renews = currentPeriodEnd ? new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(currentPeriodEnd)) : null

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">Current plan</div>
          <div className="font-display mt-1 text-[1.4rem] font-bold leading-tight">{loading ? '…' : planLabel(plan)}</div>
          <div className="text-[0.78rem] text-[color:var(--ink-dim)]">
            {plan === 'free'
              ? 'Free forever. Upgrade any time for the full toolkit.'
              : `${current?.priceLabel} ${current?.unit}` + (status === 'past_due' ? ' · payment overdue' : renews ? ` · renews ${renews}` : '')}
          </div>
        </div>
        {plan === 'free' ? (
          <button onClick={() => actions.openUpgrade()} className="btn-primary">
            <Sparkles size={15} /> Upgrade
          </button>
        ) : (
          <div className="flex gap-2">
            {plan !== 'growth' && (
              <button onClick={() => actions.openUpgrade()} className="btn-ghost">Change plan</button>
            )}
            {hasCustomer && !isDemoBilling && (
              <button onClick={manage} disabled={busy} className="btn-ghost">
                <CreditCard size={14} /> {busy ? 'Opening…' : 'Manage billing'} <ExternalLink size={12} />
              </button>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-[0.78rem] text-[color:var(--danger)]">{error}</p>}
      {current && (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {current.features.map(f => (
            <li key={f} className="text-[0.8rem] text-[color:var(--ink-dim)]">✓ {f}</li>
          ))}
        </ul>
      )}
      {isDemoBilling && <p className="text-[0.72rem] text-[color:var(--ink-faint)]">Demo mode — plans are activated on this device only; nothing is charged.</p>}
    </div>
  )
}

export function SettingsView() {
  const [segment, setSegment] = useSegment(SEGMENTS, 'profile')
  const { isDemo, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[1.05rem] font-bold">Settings</h2>
          <p className="text-[0.78rem] text-[color:var(--ink-dim)]">Your profile, plan and how you're notified.</p>
        </div>
        <button
          onClick={async () => {
            await signOut()
            navigate('/')
          }}
          className="btn-ghost btn-danger"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>

      <SegmentBar
        label="Settings sections"
        value={segment}
        onChange={setSegment}
        segments={[
          { key: 'profile', label: 'Profile', icon: User },
          { key: 'billing', label: 'Plan & billing', icon: CreditCard },
          { key: 'notifications', label: 'Notifications', icon: Bell },
        ]}
      />

      {segment === 'profile' && <ProfileView />}
      {segment === 'billing' && <PlanBillingCard />}
      {segment === 'notifications' && (
        <div className="grid gap-4 md:grid-cols-2">
          <NotificationsCard />
          <QuietHoursCard />
          <p className="flex items-start gap-2 text-[0.74rem] text-[color:var(--ink-faint)] md:col-span-2">
            <Moon size={13} className="mt-0.5 shrink-0" /> Email, SMS and Slack delivery are on the roadmap — for now Remindly nudges you in the browser and on installed mobile web apps.
          </p>
        </div>
      )}

      {isDemo && (
        <div className="card px-[18px] py-3 text-[0.75rem] leading-relaxed text-[color:var(--ink-faint)]">
          Running in demo mode — connect Supabase (see README) to enable real accounts, saved data and billing.
        </div>
      )}
    </div>
  )
}
