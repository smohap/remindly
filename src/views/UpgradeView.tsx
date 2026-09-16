import { useState } from 'react'
import { ArrowLeft, Check, Sparkles } from 'lucide-react'
import { isDemoBilling, startCheckout } from '../lib/billingClient'
import { cn } from '../lib/cn'
import { PLANS, planForFeature, planRank, type PlanId } from '../lib/plans'
import { usePlan } from '../lib/usePlan'
import { useStore } from '../store'

/**
 * The plan chooser. Reached from any UpgradeGate (with the unlocking plan
 * pre-selected) or from Settings → Plan & billing. "Continue to checkout"
 * hands off to Stripe; in demo mode it activates the plan locally.
 */
export function UpgradeView() {
  const { state, actions } = useStore()
  const { plan: current, loading } = usePlan()
  const suggested = state.upgradeFeature ? planForFeature(state.upgradeFeature) : 'plus'
  const [selected, setSelected] = useState<PlanId>(planRank(suggested) > planRank(current) ? suggested : current === 'growth' ? 'growth' : 'plus')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const paid = PLANS.filter(p => p.id !== 'free')

  async function checkout() {
    setBusy(true)
    setError(null)
    const result = await startCheckout(selected)
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    if (result.url) {
      window.location.assign(result.url)
      return
    }
    // Demo: activated locally — go back to where the person came from.
    actions.setTab(state.upgradeReturnTab)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => actions.setTab(state.upgradeReturnTab)} className="btn-ghost px-2.5" aria-label="Back">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="font-display text-[1.1rem] font-bold leading-tight">Choose a plan</h2>
          <p className="text-[0.78rem] text-[color:var(--ink-dim)]">Prices in NZD per month, excluding GST. Cancel any time.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {paid.map(p => {
          const isCurrent = p.id === current
          const isSelected = p.id === selected
          const downgrade = planRank(p.id) < planRank(current)
          return (
            <button
              key={p.id}
              type="button"
              disabled={isCurrent || downgrade}
              onClick={() => setSelected(p.id)}
              aria-pressed={isSelected}
              className={cn(
                'card flex flex-col p-5 text-left transition',
                isSelected && 'border-[color:var(--accent)] ring-2 ring-[color:var(--accent-soft)]',
                (isCurrent || downgrade) && 'opacity-60',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-[1rem] font-bold">{p.name}</span>
                {isCurrent && <span className="badge bg-[color:var(--accent-soft)] text-[color:var(--accent)]">Current</span>}
                {!isCurrent && p.highlight && <span className="badge bg-[color:var(--subtle-2)] text-[color:var(--ink-dim)]">Popular</span>}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-[1.7rem] font-extrabold">{p.priceLabel}</span>
                <span className="text-[0.72rem] text-[color:var(--ink-faint)]">{p.unit}</span>
              </div>
              <div className="text-[0.74rem] text-[color:var(--ink-faint)]">{p.who}</div>
              <ul className="mt-4 flex flex-col gap-1.5">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-[0.8rem] text-[color:var(--ink-dim)]">
                    <Check size={14} className="mt-[3px] shrink-0 text-[color:var(--ok)]" /> {f}
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[0.82rem] text-[color:var(--ink-dim)]">
          {isDemoBilling
            ? 'Demo mode — no card is charged; the plan is activated on this device.'
            : 'You will be taken to Stripe to enter payment details securely.'}
          {error && <div className="mt-1 text-[color:var(--danger)]">{error}</div>}
        </div>
        <button onClick={checkout} disabled={busy || loading || selected === current} className="btn-primary shrink-0">
          <Sparkles size={15} />
          {busy ? 'Opening checkout…' : isDemoBilling ? 'Activate (demo — no charge)' : 'Continue to checkout'}
        </button>
      </div>
    </div>
  )
}
