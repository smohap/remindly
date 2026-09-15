import { describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'
import { applyStripeEvent, type BillingRow } from './_lib/webhook'
import { planForPrice, readEnv } from './_lib/env'

const env = readEnv({
  STRIPE_SECRET_KEY: 'sk_test', STRIPE_WEBHOOK_SECRET: 'whsec', STRIPE_PRICE_PLUS: 'price_plus',
  STRIPE_PRICE_TEAM: 'price_team', STRIPE_PRICE_GROWTH: 'price_growth', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srk',
} as NodeJS.ProcessEnv)!

function sub(over: Partial<Stripe.Subscription> & { price?: string }): Stripe.Subscription {
  return {
    id: 'sub_1', status: 'active', customer: 'cus_1', metadata: { user_id: 'user-1' },
    items: { data: [{ price: { id: over.price ?? 'price_plus' }, current_period_end: 1_800_000_000 }] },
    ...over,
  } as unknown as Stripe.Subscription
}

function deps(rows: BillingRow[]) {
  return {
    planForPrice: (p: string | undefined) => planForPrice(env, p),
    retrieveSubscription: vi.fn(async () => sub({})),
    upsert: async (row: BillingRow) => { rows.push(row) },
  }
}

describe('readEnv', () => {
  it('returns null when any key is missing', () => {
    expect(readEnv({} as NodeJS.ProcessEnv)).toBeNull()
    expect(env.prices.team).toBe('price_team')
  })
})

describe('applyStripeEvent', () => {
  it('checkout.session.completed grants the plan from the subscription price', async () => {
    const rows: BillingRow[] = []
    const event = { type: 'checkout.session.completed', data: { object: { mode: 'subscription', subscription: 'sub_1', client_reference_id: 'user-1' } } } as unknown as Stripe.Event
    const row = await applyStripeEvent(event, deps(rows))
    expect(row).toMatchObject({ user_id: 'user-1', plan: 'plus', status: 'active', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1' })
    expect(rows).toHaveLength(1)
    expect(row?.current_period_end).toBe(new Date(1_800_000_000 * 1000).toISOString())
  })

  it('subscription.updated to a different price changes the plan', async () => {
    const rows: BillingRow[] = []
    const event = { type: 'customer.subscription.updated', data: { object: sub({ price: 'price_growth' }) } } as unknown as Stripe.Event
    await applyStripeEvent(event, deps(rows))
    expect(rows[0].plan).toBe('growth')
  })

  it('subscription.deleted drops the user to free', async () => {
    const rows: BillingRow[] = []
    const event = { type: 'customer.subscription.deleted', data: { object: sub({ status: 'canceled' }) } } as unknown as Stripe.Event
    await applyStripeEvent(event, deps(rows))
    expect(rows[0]).toMatchObject({ plan: 'free', status: 'canceled', stripe_subscription_id: null })
  })

  it('ignores events it does not handle and subscriptions without a user', async () => {
    const rows: BillingRow[] = []
    expect(await applyStripeEvent({ type: 'invoice.paid', data: { object: {} } } as unknown as Stripe.Event, deps(rows))).toBeNull()
    expect(await applyStripeEvent({ type: 'customer.subscription.updated', data: { object: sub({ metadata: {} }) } } as unknown as Stripe.Event, deps(rows))).toBeNull()
    expect(rows).toHaveLength(0)
  })
})
