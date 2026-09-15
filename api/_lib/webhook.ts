import type Stripe from 'stripe'
import type { PlanId } from '../../src/lib/plans'

export interface BillingRow {
  user_id: string
  plan: PlanId
  status: string
  stripe_customer_id?: string
  stripe_subscription_id?: string | null
  current_period_end?: string | null
}

export interface WebhookDeps {
  planForPrice: (priceId: string | undefined) => PlanId
  retrieveSubscription: (id: string) => Promise<Stripe.Subscription>
  upsert: (row: BillingRow) => Promise<void>
}

/** Statuses under which the paid plan stays unlocked. */
const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])

function periodEnd(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined
  const ts = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end
  return ts ? new Date(ts * 1000).toISOString() : null
}

function userIdOf(sub: Stripe.Subscription): string | undefined {
  return sub.metadata?.user_id
}

/** Turn a subscription object into the row we store. */
export function rowFromSubscription(sub: Stripe.Subscription, deps: Pick<WebhookDeps, 'planForPrice'>, userId?: string): BillingRow | null {
  const uid = userId ?? userIdOf(sub)
  if (!uid) return null
  const live = LIVE_STATUSES.has(sub.status)
  const price = sub.items?.data?.[0]?.price?.id
  return {
    user_id: uid,
    plan: live ? deps.planForPrice(price) : 'free',
    status: sub.status,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
    stripe_subscription_id: live ? sub.id : null,
    current_period_end: live ? periodEnd(sub) : null,
  }
}

/**
 * The events we care about all resolve to "what plan is this user on now".
 * Unknown events are acknowledged and ignored.
 */
export async function applyStripeEvent(event: Stripe.Event, deps: WebhookDeps): Promise<BillingRow | null> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription' || !session.subscription) return null
      const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
      const sub = await deps.retrieveSubscription(subId)
      const uid = session.client_reference_id ?? session.metadata?.user_id ?? undefined
      const row = rowFromSubscription(sub, deps, uid)
      if (row) await deps.upsert(row)
      return row
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const row = rowFromSubscription(event.data.object as Stripe.Subscription, deps)
      if (row) await deps.upsert(row)
      return row
    }
    default:
      return null
  }
}
