import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { json, withErrors } from './_lib/http.js'

/**
 * POST { userId } — permanently removes an account (auth user + profile via
 * cascade). Only a Super Admin may call it, and never on themselves.
 * Needs SUPABASE_SERVICE_ROLE_KEY; deleting auth users is not possible from
 * the browser.
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

  const { userId } = (req.body ?? {}) as { userId?: string }
  if (!userId || typeof userId !== 'string') return json(res, 400, { error: 'invalid_user' })
  if (userId === me.user.id) return json(res, 400, { error: 'cannot_delete_self' })

  const { data: target } = await admin.from('profiles').select('full_name, email').eq('id', userId).maybeSingle()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return json(res, 500, { error: error.message })

  await admin.from('audit_log').insert({
    actor_id: me.user.id,
    actor_name: profile.full_name ?? 'Super Admin',
    action: 'user.removed',
    entity: 'profile',
    entity_id: null,
    detail: { name: target?.full_name, email: target?.email },
  })
  return json(res, 200, { ok: true })
}

export default withErrors(handler)
