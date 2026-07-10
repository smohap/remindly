import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * True when real Supabase credentials are present. When false, the app runs in
 * demo mode: authentication is simulated locally so the UI is fully usable
 * without a backend (e.g. the preview build, or a Vercel deploy before env
 * vars are configured).
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null
