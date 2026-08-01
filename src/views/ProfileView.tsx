import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, LogOut, Sparkles } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { cn } from '../lib/cn'
import { useGroups } from '../lib/useGroups'
import { LANGUAGES, TIMEZONES, useProfile } from '../lib/useProfile'
import { useStore } from '../store'
import { useBookmarks, useLists, useNotes, usePremium } from '../lib/useWorkspace'

const field =
  'w-full rounded-[12px] border border-[color:var(--glass-border)] bg-white/[0.08] px-3.5 py-2.5 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)] md:text-[0.85rem]'
const labelCls = 'mb-1.5 block text-[0.72rem] font-semibold text-[color:var(--ink-dim)]'

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="glass flex flex-col items-center gap-0.5 px-3 py-4">
      <span className="font-display text-[1.35rem] font-extrabold leading-none">{value}</span>
      <span className="text-[0.68rem] text-[color:var(--ink-faint)]">{label}</span>
    </div>
  )
}

export function ProfileView() {
  const { user, signOut } = useAuth()
  const { profile, save } = useProfile()
  const { isPremium } = usePremium()
  const { groups } = useGroups()
  const { lists } = useLists()
  const { notes } = useNotes()
  const { bookmarks } = useBookmarks()
  const { derived } = useStore()
  const navigate = useNavigate()

  const [f, setF] = useState({ ...profile, displayName: profile.displayName || user?.name || '' })
  const [saved, setSaved] = useState(false)

  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => setF(prev => ({ ...prev, [key]: value }))

  const initials = (f.displayName || user?.name || 'PN')
    .trim()
    .split(/\s+/)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    save(f)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Identity header */}
      <div className="glass flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--magenta),var(--violet))] text-2xl font-bold">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display truncate text-[1.4rem] font-bold">{f.displayName || user?.name || 'Your name'}</h2>
            {isPremium && (
              <span className="flex items-center gap-1 rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-2.5 py-[2px] text-[0.6rem] font-extrabold uppercase tracking-[0.06em] text-[#1a1240]">
                <Sparkles size={10} /> Premium
              </span>
            )}
          </div>
          <p className="truncate text-[0.85rem] text-[color:var(--ink-dim)]">{user?.email ?? 'demo@remindly.app'}</p>
          {(f.jobTitle || f.company) && (
            <p className="mt-0.5 truncate text-[0.8rem] text-[color:var(--ink-faint)]">
              {[f.jobTitle, f.company].filter(Boolean).join(' · ')}
            </p>
          )}
          {f.bio && <p className="mt-2 max-w-lg text-[0.82rem] leading-relaxed text-[color:var(--ink-dim)]">{f.bio}</p>}
          <div className="mt-2 flex flex-wrap gap-2 text-[0.72rem] text-[color:var(--ink-faint)]">
            {f.location && <span className="rounded-full bg-white/[0.08] px-2.5 py-1">📍 {f.location}</span>}
            <span className="rounded-full bg-white/[0.08] px-2.5 py-1">🕓 {f.timezone.replace('_', ' ')}</span>
            <span className="rounded-full bg-white/[0.08] px-2.5 py-1">🌐 {f.language}</span>
          </div>
        </div>
      </div>

      {/* At a glance */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat value={derived.counts.today} label="Due today" />
        <Stat value={groups.length} label="Groups" />
        <Stat value={lists.length} label="Lists" />
        <Stat value={notes.length} label="Notes" />
        <Stat value={bookmarks.length} label="Bookmarks" />
      </div>

      {/* Editable details */}
      <form onSubmit={submit} className="glass flex flex-col gap-5 p-6">
        <div>
          <h3 className="font-display text-[0.95rem] font-bold">Personal details</h3>
          <p className="text-[0.75rem] text-[color:var(--ink-dim)]">This information personalises your reminders and how dates are shown.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelCls}>Display name</span>
            <input value={f.displayName} onChange={e => set('displayName', e.target.value)} placeholder="Your name" className={field} />
          </label>
          <label>
            <span className={labelCls}>Email</span>
            <input value={user?.email ?? 'demo@remindly.app'} readOnly disabled className={cn(field, 'cursor-not-allowed opacity-60')} />
          </label>
          <label>
            <span className={labelCls}>Phone</span>
            <input type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+64 21 123 4567" className={field} />
          </label>
          <label>
            <span className={labelCls}>Date of birth</span>
            <input type="date" value={f.birthday} onChange={e => set('birthday', e.target.value)} className={field} />
          </label>
          <label className="sm:col-span-2">
            <span className={labelCls}>Bio</span>
            <textarea value={f.bio} onChange={e => set('bio', e.target.value)} rows={3} placeholder="A short line about you" className={cn(field, 'resize-none')} />
          </label>
        </div>

        <div className="border-t border-white/10 pt-5">
          <h3 className="font-display mb-3 text-[0.95rem] font-bold">Work</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className={labelCls}>Job title</span>
              <input value={f.jobTitle} onChange={e => set('jobTitle', e.target.value)} placeholder="Site Manager" className={field} />
            </label>
            <label>
              <span className={labelCls}>Company</span>
              <input value={f.company} onChange={e => set('company', e.target.value)} placeholder="Acme Ltd" className={field} />
            </label>
            <label className="sm:col-span-2">
              <span className={labelCls}>Website</span>
              <input value={f.website} onChange={e => set('website', e.target.value)} placeholder="https://example.co.nz" className={field} />
            </label>
          </div>
        </div>

        <div className="border-t border-white/10 pt-5">
          <h3 className="font-display mb-3 text-[0.95rem] font-bold">Locale & preferences</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className={labelCls}>Timezone</span>
              <select value={f.timezone} onChange={e => set('timezone', e.target.value)} className={field}>
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz} className="bg-[color:var(--indigo)]">{tz.replace('_', ' ')}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelCls}>Location</span>
              <input value={f.location} onChange={e => set('location', e.target.value)} placeholder="City, Country" className={field} />
            </label>
            <label>
              <span className={labelCls}>Language</span>
              <select value={f.language} onChange={e => set('language', e.target.value)} className={field}>
                {LANGUAGES.map(l => (
                  <option key={l} value={l} className="bg-[color:var(--indigo)]">{l}</option>
                ))}
              </select>
            </label>
            <div>
              <span className={labelCls}>Week starts on</span>
              <div className="flex gap-1.5">
                {(['monday', 'sunday'] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => set('weekStart', d)}
                    className={cn(
                      'flex-1 cursor-pointer rounded-full px-3 py-2.5 text-[0.8rem] font-semibold capitalize transition',
                      f.weekStart === d
                        ? 'bg-[color:var(--glass-strong)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                        : 'border border-[color:var(--glass-border)] bg-white/[0.06] text-[color:var(--ink-faint)]',
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button type="submit" className="flex items-center justify-center gap-2 self-start rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-6 py-2.5 text-[0.85rem] font-bold text-[#1a1240] transition hover:brightness-110">
          {saved ? (<><Check size={15} /> Saved</>) : 'Save changes'}
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
    </div>
  )
}
