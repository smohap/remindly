import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import type { BillingEnv } from './env'

export function stripeClient(env: BillingEnv): Stripe {
  return new Stripe(env.stripeSecretKey)
}

/** Service-role client: bypasses RLS. Only ever used server-side. */
export function adminClient(env: BillingEnv): SupabaseClient {
  return createClient(env.supabaseUrl, env.serviceRoleKey, { auth: { persistSession: false } })
}

/** Resolve the signed-in user from the browser's Supabase JWT. */
export async function userFromRequest(env: BillingEnv, authorization: string | undefined): Promise<{ id: string; email?: string } | null> {
  const token = authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await adminClient(env).auth.getUser(token)
  if (error || !data.user) return null
  return { id: data.user.id, email: data.user.email ?? undefined }
}
