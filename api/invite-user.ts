import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { json, originOf, withErrors } from './_lib/http.js'

/**
 * POST { groupId, email, origin? } — invite someone to a group.
 * If they have no account yet, Supabase Auth emails them a sign-up link
 * (auth.admin.inviteUserByEmail) and the profile is created by the signup
 * trigger; either way a pending membership is filed via add_group_member,
 * which runs as the caller so group-admin rules still apply.
 */
async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !serviceKey) return json(res, 503, { error: 'admin_not_configured' })

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return json(res, 401, { error: 'unauthenticated' })

  const { groupId, email, origin } = (req.body ?? {}) as { groupId?: string; email?: string; origin?: string }
  const clean = (email ?? '').trim().toLowerCase()
  if (!groupId || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return json(res, 400, { error: 'Enter a valid email address.' })

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const asCaller = createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } })

  const { data: caller } = await asCaller.auth.getUser()
  if (!caller.user) return json(res, 401, { error: 'unauthenticated' })

  let created = false
  const { data: existing } = await admin.from('profiles').select('id').ilike('email', clean).maybeSingle()
  if (!existing) {
    const { error } = await admin.auth.admin.inviteUserByEmail(clean, { redirectTo: `${originOf(req, origin)}/app` })
    if (error) return json(res, 500, { error: `Couldn't send the invitation email: ${error.message}` })
    created = true
  }

  const { error: rpcErr } = await asCaller.rpc('add_group_member', { p_group: groupId, p_email: clean })
  if (rpcErr) return json(res, 400, { error: rpcErr.message.replace(/^.*?:\s*/, '') })
  return json(res, 200, { ok: true, emailed: created })
}

export default withErrors(handler)
