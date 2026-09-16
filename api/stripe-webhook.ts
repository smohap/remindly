import type { VercelRequest, VercelResponse } from '@vercel/node'
import type Stripe from 'stripe'
import { adminClient, stripeClient } from './_lib/clients.js'
import { planForPrice, readEnv, type BillingEnv } from './_lib/env.js'
import { json, withErrors } from './_lib/http.js'
import { applyStripeEvent } from './_lib/webhook.js'

// Stripe signs the raw body; Vercel must not parse it first.
export const config = { api: { bodyParser: false } }

async function rawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks)
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })
  const env: BillingEnv | null = readEnv()
  if (!env || !env.webhookSecret) return json(res, 503, { error: 'billing_not_configured' })

  const stripe = stripeClient(env)
  const signature = req.headers['stripe-signature']
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(await rawBody(req), String(signature ?? ''), env.webhookSecret)
  } catch (e) {
    return json(res, 400, { error: 'bad_signature', message: e instanceof Error ? e.message : String(e) })
  }

  const db = adminClient(env)
  await applyStripeEvent(event, {
    planForPrice: price => planForPrice(env, price),
    retrieveSubscription: id => stripe.subscriptions.retrieve(id),
    upsert: async row => {
      const { error } = await db.from('billing_subscriptions').upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      if (error) throw new Error(error.message)
    },
  })
  return json(res, 200, { received: true })
}

export default withErrors(handler)
