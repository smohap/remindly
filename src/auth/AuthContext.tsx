/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export interface AuthUser {
  id: string
  email: string
  name: string
  initials: string
  avatarUrl?: string
}

interface AuthValue {
  user: AuthUser | null
  loading: boolean
  /** True when no Supabase backend is configured — auth is simulated locally. */
  isDemo: boolean
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>
  signInWithGoogle: () => Promise<{ error?: string }>
  signInAsDemo: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)
const DEMO_KEY = 'remindly.demoUser'

function initials(from: string) {
  const parts = from.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return from.slice(0, 2).toUpperCase()
}

function sessionToUser(session: Session | null): AuthUser | null {
  if (!session?.user) return null
  const u = session.user
  const name = (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || (u.email ?? 'User').split('@')[0]
  return {
    id: u.id,
    email: u.email ?? '',
    name,
    initials: initials(name),
    avatarUrl: (u.user_metadata?.avatar_url as string) || undefined,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      // Demo mode — restore a simulated session if one exists.
      const saved = localStorage.getItem(DEMO_KEY)
      if (saved) setUser(JSON.parse(saved))
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(sessionToUser(data.session))
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(sessionToUser(session))
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthValue>(() => {
    const setDemoUser = (name: string, email: string) => {
      const demo: AuthUser = { id: 'demo', email, name, initials: initials(name) }
      localStorage.setItem(DEMO_KEY, JSON.stringify(demo))
      setUser(demo)
    }

    return {
      user,
      loading,
      isDemo: !isSupabaseConfigured,
      async signInWithPassword(email, password) {
        if (!supabase) {
          setDemoUser(email.split('@')[0] || 'Priya Nair', email)
          return {}
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return error ? { error: error.message } : {}
      },
      async signUp(name, email, password) {
        if (!supabase) {
          setDemoUser(name || 'Priya Nair', email)
          return {}
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        })
        if (error) return { error: error.message }
        return { needsConfirmation: !data.session }
      },
      async signInWithGoogle() {
        if (!supabase) {
          setDemoUser('Priya Nair', 'demo@remindly.app')
          return {}
        }
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/app` },
        })
        return error ? { error: error.message } : {}
      },
      signInAsDemo() {
        // Never bypass a real backend: when Supabase is configured the only
        // ways in are email/password and Google.
        if (isSupabaseConfigured) return
        setDemoUser('Priya Nair', 'demo@remindly.app')
      },
      async signOut() {
        if (supabase) await supabase.auth.signOut()
        localStorage.removeItem(DEMO_KEY)
        setUser(null)
      },
    }
  }, [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
