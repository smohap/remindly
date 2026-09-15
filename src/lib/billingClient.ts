import type { PlanId } from './plans'
import { supabase } from './supabase'
import { activateDemoPlan } from './usePlan'

/**
 * Browser side of the Stripe flow. Talks to the Vercel functions in /api,
 * which hold the secret key. In demo mode (no Supabase) there is nothing to
 * charge, so the plan is simply activated locally.
 */

export type BillingResult = { ok: true; url?: string } | { ok: false; reason: 'not_configured' | 'unauthenticated' | 'no_customer' | 'error'; message: string }

async function authHeader(): Promise<Record<string, string> | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : null
}

async function post(path: string, body: unknown): Promise<BillingResult> {
  const auth = await authHeader()
  if (!auth) return { ok: false, reason: 'unauthenticated', message: 'Sign in again to continue.' }
  try {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify(body) })
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
    if (res.status === 503 || json.error === 'billing_not_configured') {
      return { ok: false, reason: 'not_configured', message: "Billing isn't configured on this deployment yet." }
    }
    if (res.status === 404 && json.error === 'no_customer') {
      return { ok: false, reason: 'no_customer', message: 'No billing account yet — upgrade first.' }
    }
    if (!res.ok || !json.url) return { ok: false, reason: 'error', message: json.error ?? `Request failed (${res.status})` }
    return { ok: true, url: json.url }
  } catch (e) {
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function startCheckout(plan: PlanId): Promise<BillingResult> {
  if (!supabase) {
    activateDemoPlan(plan)
    return { ok: true }
  }
  return post('/api/create-checkout-session', { plan, origin: window.location.origin })
}

export async function openBillingPortal(): Promise<BillingResult> {
  if (!supabase) return { ok: false, reason: 'not_configured', message: 'No billing portal in demo mode.' }
  return post('/api/create-portal-session', { origin: window.location.origin })
}

export const isDemoBilling = !supabase
