import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { AuroraBackground } from '../components/AuroraBackground'
import { Brand, GoogleIcon } from '../components/Brand'
import { useAuth } from '../auth/AuthContext'

type Mode = 'signin' | 'signup'

export default function Login() {
  const { signInWithPassword, signUp, signInWithGoogle, signInAsDemo, isDemo } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    const res = mode === 'signin' ? await signInWithPassword(email, password) : await signUp(name, email, password)
    setBusy(false)
    if (res.error) return setError(res.error)
    if ('needsConfirmation' in res && res.needsConfirmation) {
      return setNotice('Check your inbox to confirm your email, then sign in.')
    }
    navigate('/app')
  }

  async function google() {
    setError(null)
    const res = await signInWithGoogle()
    if (res.error) return setError(res.error)
    if (isDemo) navigate('/app') // OAuth redirect handles the real flow
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <AuroraBackground />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="glass relative z-10 w-full max-w-[420px] p-7 sm:p-9"
      >
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
        <h1 className="font-display mb-1 text-center text-[1.5rem] font-bold text-white">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mb-6 text-center text-[0.82rem] text-[color:var(--ink-dim)]">
          {mode === 'signin' ? 'Sign in to your reminders' : 'Start coordinating reminders in minutes'}
        </p>

        <button
          onClick={google}
          className="mb-4 flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border border-[color:var(--glass-border)] bg-white/[0.10] py-3 text-[0.9rem] font-semibold text-white transition hover:bg-white/[0.16] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)]"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="mb-4 flex items-center gap-3 text-[0.72rem] text-[color:var(--ink-faint)]">
          <span className="h-px flex-1 bg-white/15" />
          or
          <span className="h-px flex-1 bg-white/15" />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === 'signup' && (
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name"
              autoComplete="name"
              required
              className="w-full rounded-[14px] border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-3 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)]"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
            className="w-full rounded-[14px] border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-3 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)]"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            className="w-full rounded-[14px] border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-3 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)]"
          />

          {error && <p className="text-[0.8rem] text-[color:var(--red)]">{error}</p>}
          {notice && <p className="text-[0.8rem] text-[color:var(--teal)]">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 w-full cursor-pointer rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] py-3 text-[0.9rem] font-bold text-[#1a1240] transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-[0.82rem] text-[color:var(--ink-dim)]">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
              setNotice(null)
            }}
            className="cursor-pointer font-semibold text-white underline-offset-2 hover:underline"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        {isDemo && (
          <div className="mt-6 rounded-[14px] border border-[color:var(--glass-border)] bg-white/[0.06] p-3 text-center text-[0.75rem] text-[color:var(--ink-dim)]">
            Demo mode — no backend connected. Any credentials work, or{' '}
            <button onClick={() => { signInAsDemo(); navigate('/app') }} className="cursor-pointer font-semibold text-white underline">
              explore as Priya
            </button>
            .
          </div>
        )}

        <p className="mt-6 text-center text-[0.75rem]">
          <Link to="/" className="text-[color:var(--ink-faint)] hover:text-white">← Back to home</Link>
        </p>
      </motion.div>
    </div>
  )
}
