import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isPlanId } from './_lib/plans.js'
import { adminClient, stripeClient, userFromRequest } from './_lib/clients.js'
import { guard, json, originOf, withErrors } from './_lib/http.js'

/**
 * POST { plan: 'plus' | 'team' | 'growth', origin?: string }
 * -> { url } of a Stripe Checkout Session for the signed-in user.
 */
async function handler(req: VercelRequest, res: VercelResponse) {
  const env = guard(req, res)
  if (!env) return

  const user = await userFromRequest(env, req.headers.authorization)
  if (!user) return json(res, 401, { error: 'unauthenticated' })

  const body = (req.body ?? {}) as { plan?: unknown; origin?: unknown }
  const plan = body.plan
  if (!isPlanId(plan) || plan === 'free') return json(res, 400, { error: 'invalid_plan' })

  const stripe = stripeClient(env)
  const db = adminClient(env)

  // Reuse the customer if this user has bought before.
  const { data: existing } = await db.from('billing_subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle()
  let customerId = (existing?.stripe_customer_id as string | null) ?? null
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } })
    customerId = customer.id
    await db.from('billing_subscriptions').upsert({ user_id: user.id, stripe_customer_id: customerId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  }

  const origin = originOf(req, body.origin)
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: env.prices[plan], quantity: 1 }],
    success_url: `${origin}/app?checkout=success`,
    cancel_url: `${origin}/app?checkout=cancelled`,
    allow_promotion_codes: true,
    metadata: { user_id: user.id, plan },
    subscription_data: { metadata: { user_id: user.id, plan } },
  })
  return json(res, 200, { url: session.url })
}

export default withErrors(handler)
