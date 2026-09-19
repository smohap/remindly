import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { json, withErrors } from './_lib/http.js'
import { isPlanId } from './_lib/plans.js'

/**
 * POST { userId, plan } — a Super Admin sets someone's plan directly
 * (complimentary access, manual invoicing, support cases). Recorded with
 * status 'granted' so it's distinguishable from a Stripe subscription; a
 * later Stripe event for that user overwrites it.
 */
async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return json(res, 503, { error: 'admin_not_configured' })

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return json(res, 401, { error: 'unauthenticated' })
  const { data: me, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !me.user) return json(res, 401, { error: 'unauthenticated' })

  const { data: profile } = await admin.from('profiles').select('role, full_name').eq('id', me.user.id).maybeSingle()
  if (profile?.role !== 'super_admin') return json(res, 403, { error: 'forbidden' })

  const { userId, plan } = (req.body ?? {}) as { userId?: string; plan?: string }
  if (!userId || typeof userId !== 'string') return json(res, 400, { error: 'invalid_user' })
  if (!isPlanId(plan)) return json(res, 400, { error: 'invalid_plan' })

  const { error } = await admin.from('billing_subscriptions').upsert(
    { user_id: userId, plan, status: plan === 'free' ? 'none' : 'granted', stripe_subscription_id: null, current_period_end: null, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  )
  if (error) return json(res, 500, { error: error.message })

  const { data: target } = await admin.from('profiles').select('full_name, email').eq('id', userId).maybeSingle()
  await admin.from('audit_log').insert({
    actor_id: me.user.id,
    actor_name: profile.full_name ?? 'Super Admin',
    action: 'plan.granted',
    entity: 'profile',
    entity_id: null,
    detail: { name: target?.full_name, email: target?.email, plan },
  })
  return json(res, 200, { ok: true })
}

export default withErrors(handler)
