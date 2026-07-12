import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { TIMEZONES, useProfile } from '../lib/useProfile'

export function ProfileView() {
  const { user, signOut } = useAuth()
  const { profile, save } = useProfile()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(profile.displayName || user?.name || '')
  const [timezone, setTimezone] = useState(profile.timezone)
  const [location, setLocation] = useState(profile.location)
  const [saved, setSaved] = useState(false)

  const initials = (displayName || user?.name || 'PN')
    .trim()
    .split(/\s+/)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    save({ displayName, timezone, location })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const field =
    'w-full rounded-[14px] border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-3 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)]'

  return (
    <>
      <div className="glass flex items-center gap-4 p-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--magenta),var(--violet))] text-lg font-bold">
          {initials}
        </div>
        <div className="min-w-0">
          <h2 className="font-display truncate text-[1.3rem] font-bold">{displayName || user?.name || 'Your name'}</h2>
          <p className="truncate text-[0.82rem] text-[color:var(--ink-dim)]">{user?.email ?? 'demo@remindly.app'}</p>
          <span className="mt-1 inline-block rounded-full bg-white/[0.12] px-2.5 py-[2px] text-[0.62rem] font-bold uppercase tracking-[0.06em] text-[color:var(--ink-dim)]">
            {profile.role}
          </span>
        </div>
      </div>

      <form onSubmit={submit} className="glass flex flex-col gap-4 p-6">
        <h3 className="font-display text-[0.95rem] font-bold">Profile details</h3>

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.75rem] font-semibold text-[color:var(--ink-dim)]">Display name</span>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} className={field} placeholder="Your name" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.75rem] font-semibold text-[color:var(--ink-dim)]">Email</span>
          <input value={user?.email ?? 'demo@remindly.app'} readOnly disabled className={`${field} cursor-not-allowed opacity-60`} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.75rem] font-semibold text-[color:var(--ink-dim)]">Timezone</span>
            <select value={timezone} onChange={e => setTimezone(e.target.value)} className={field}>
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz} className="bg-[color:var(--indigo)]">
                  {tz.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.75rem] font-semibold text-[color:var(--ink-dim)]">Location</span>
            <input value={location} onChange={e => setLocation(e.target.value)} className={field} placeholder="City, Country" />
          </label>
        </div>

        <button
          type="submit"
          className="flex items-center justify-center gap-2 self-start rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-6 py-2.5 text-[0.85rem] font-bold text-[#1a1240] transition hover:brightness-110"
        >
          {saved ? (
            <>
              <Check size={15} /> Saved
            </>
          ) : (
            'Save changes'
          )}
        </button>
      </form>

      <button
        onClick={async () => {
          await signOut()
          navigate('/')
        }}
        className="glass flex cursor-pointer items-center justify-center gap-2 px-[18px] py-3.5 text-[0.85rem] font-semibold text-[color:var(--ink-dim)] transition hover:text-[color:var(--red)]"
      >
        <LogOut size={16} /> Sign out
      </button>
    </>
  )
}
