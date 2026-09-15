import { useEffect, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { logActivity } from '../lib/activityStore'
import { planLabel } from '../lib/plans'
import { refreshPlan } from '../lib/usePlan'

/**
 * Handles coming back from Stripe (`/app?checkout=success|cancelled`).
 * The webhook that grants the plan can land a moment after the redirect,
 * so on success we poll the plan for up to 12 s before giving up.
 */
export function CheckoutReturn() {
  const [banner, setBanner] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const outcome = params.get('checkout')
    if (!outcome) return
    // Clear the query so a refresh doesn't replay this.
    window.history.replaceState({}, '', window.location.pathname)

    if (outcome === 'cancelled') {
      setBanner({ tone: 'warn', text: 'Checkout cancelled — nothing was charged.' })
      return
    }

    let cancelled = false
    const started = Date.now()
    const poll = async () => {
      const before = (await refreshPlan()).plan
      if (cancelled) return
      if (before !== 'free') {
        setBanner({ tone: 'ok', text: `You're on ${planLabel(before)}. Everything it includes is unlocked.` })
        logActivity('plan.changed', `Upgraded to ${planLabel(before)}`)
        return
      }
      if (Date.now() - started < 12_000) setTimeout(poll, 1500)
      else setBanner({ tone: 'warn', text: 'Payment received — your plan will activate in a moment. Refresh if it hasn’t after a minute.' })
    }
    void poll()
    return () => {
      cancelled = true
    }
  }, [])

  if (!banner) return null
  return (
    <div
      role="status"
      className={
        'fixed inset-x-4 top-4 z-[70] mx-auto flex max-w-lg items-center gap-3 rounded-xl border px-4 py-3 text-[0.85rem] shadow-lg ' +
        (banner.tone === 'ok'
          ? 'border-[rgba(52,211,153,0.4)] bg-[#12251f] text-[#bff2dc]'
          : 'border-[rgba(251,191,36,0.4)] bg-[#2a2210] text-[#fde9a8]')
      }
    >
      <CheckCircle2 size={18} className="shrink-0" />
      <span className="flex-1">{banner.text}</span>
      <button onClick={() => setBanner(null)} aria-label="Dismiss" className="cursor-pointer opacity-70 hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  )
}
