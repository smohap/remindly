import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient, stripeClient, userFromRequest } from './_lib/clients.js'
import { guard, json, originOf, withErrors } from './_lib/http.js'

/** POST { origin? } -> { url } of the Stripe Customer Portal for the signed-in user. */
async function handler(req: VercelRequest, res: VercelResponse) {
  const env = guard(req, res)
  if (!env) return

  const user = await userFromRequest(env, req.headers.authorization)
  if (!user) return json(res, 401, { error: 'unauthenticated' })

  const { data } = await adminClient(env).from('billing_subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle()
  const customerId = data?.stripe_customer_id as string | null | undefined
  if (!customerId) return json(res, 404, { error: 'no_customer' })

  const body = (req.body ?? {}) as { origin?: unknown }
  const session = await stripeClient(env).billingPortal.sessions.create({
    customer: customerId,
    return_url: `${originOf(req, body.origin)}/app`,
  })
  return json(res, 200, { url: session.url })
}

export default withErrors(handler)
