import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { makeStore } from './localStore'
import { isPlanId, planAllows, type Feature, type PlanId } from './plans'
import { supabase } from './supabase'
import { currentUserId } from './invoicesDb'

/**
 * Which plan the signed-in user is on.
 *
 * Source of truth is `billing_subscriptions`, written only by the Stripe
 * webhook — the browser can read it but never change it. In demo mode
 * (no Supabase) the plan lives in localStorage so the upgrade flow can be
 * exercised end-to-end without a card.
 */

export interface PlanState {
  plan: PlanId
  /** Stripe subscription status ('active', 'past_due', 'canceled'…) or 'none'. */
  status: string
  currentPeriodEnd?: string
  hasCustomer: boolean
  loading: boolean
}

export const planStore = makeStore<PlanState>('remindly.plan.v1', { plan: 'free', status: 'none', hasCustomer: false, loading: Boolean(supabase) })

let fetched = false

export async function refreshPlan(): Promise<PlanState> {
  if (!supabase) {
    const cur = planStore.get()
    if (cur.loading) planStore.set({ ...cur, loading: false })
    return planStore.get()
  }
  const uid = await currentUserId()
  if (!uid) {
    planStore.set({ plan: 'free', status: 'none', hasCustomer: false, loading: false })
    return planStore.get()
  }
  const { data } = await supabase
    .from('billing_subscriptions')
    .select('plan, status, current_period_end, stripe_customer_id')
    .eq('user_id', uid)
    .maybeSingle()
  const plan = isPlanId(data?.plan) ? data.plan : 'free'
  planStore.set({
    plan,
    status: String(data?.status ?? 'none'),
    currentPeriodEnd: (data?.current_period_end as string | null) ?? undefined,
    hasCustomer: Boolean(data?.stripe_customer_id),
    loading: false,
  })
  fetched = true
  return planStore.get()
}

/** Demo mode only: pretend the checkout succeeded. */
export function activateDemoPlan(plan: PlanId) {
  if (supabase) return
  planStore.set({ plan, status: plan === 'free' ? 'none' : 'active', hasCustomer: false, loading: false })
}

export function usePlan() {
  const state = useSyncExternalStore(planStore.subscribe, planStore.get, planStore.get)
  useEffect(() => {
    if (!fetched) void refreshPlan()
  }, [])
  const can = useCallback((feature: Feature) => planAllows(state.plan, feature), [state.plan])
  return { ...state, can, refresh: refreshPlan }
}
