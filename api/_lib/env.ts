import type { PlanId } from './plans.js'

/**
 * Server-side configuration for the billing functions. Everything here is
 * read at call time (not import time) so a missing key produces a clear
 * 503 "billing_not_configured" instead of a crash at cold start.
 */
export interface BillingEnv {
  stripeSecretKey: string
  webhookSecret: string
  prices: Record<Exclude<PlanId, 'free'>, string>
  supabaseUrl: string
  serviceRoleKey: string
}

export function readEnv(source: NodeJS.ProcessEnv = process.env): BillingEnv | null {
  const stripeSecretKey = source.STRIPE_SECRET_KEY
  const webhookSecret = source.STRIPE_WEBHOOK_SECRET ?? ''
  const plus = source.STRIPE_PRICE_PLUS
  const team = source.STRIPE_PRICE_TEAM
  const growth = source.STRIPE_PRICE_GROWTH
  const supabaseUrl = source.SUPABASE_URL ?? source.VITE_SUPABASE_URL
  const serviceRoleKey = source.SUPABASE_SERVICE_ROLE_KEY
  if (!stripeSecretKey || !plus || !team || !growth || !supabaseUrl || !serviceRoleKey) return null
  return { stripeSecretKey, webhookSecret, prices: { plus, team, growth }, supabaseUrl, serviceRoleKey }
}

/** Reverse lookup: which plan does a Stripe price id belong to? */
export function planForPrice(env: BillingEnv, priceId: string | undefined): PlanId {
  if (!priceId) return 'free'
  for (const [plan, id] of Object.entries(env.prices)) if (id === priceId) return plan as PlanId
  return 'free'
}
