/**
 * One-time local cleanup. Earlier builds shipped sample reminders, groups,
 * invoices and so on that were adopted into localStorage on first run. They
 * are gone from the code now; this drops any on-device copy so nobody keeps
 * seeing "Priya's" demo data. Signed-in users re-hydrate from Postgres.
 */
const FLAG = 'remindly.migrated.v2'
const KEEP = new Set(['remindly.demoUser', 'remindly.plan.v1', 'remindly.notify.v1', FLAG])

function runLocalCleanup() {
  try {
    if (localStorage.getItem(FLAG)) return
    const doomed: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('remindly.') && !KEEP.has(key)) doomed.push(key)
    }
    doomed.forEach(k => localStorage.removeItem(k))
    localStorage.setItem(FLAG, new Date().toISOString())
  } catch {
    /* private mode — nothing to clean */
  }
}

runLocalCleanup()

/**
 * Account switch guard. Local data is per device, not per account: if a
 * different person signs in on this browser, the previous user's reminders,
 * lists and so on must not be carried over (the sync layer would otherwise
 * adopt them into the new account on first run). The signed-in user is read
 * synchronously from the Supabase session (or the demo user) before any
 * store module loads.
 */
const LAST_USER = 'remindly.lastUser'
const KEEP_ACROSS_USERS = new Set(['remindly.theme.v1', 'remindly.migrated.v2', LAST_USER])

function currentUserSync(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key)
        const parsed = raw ? (JSON.parse(raw) as { user?: { id?: string } }) : null
        if (parsed?.user?.id) return parsed.user.id
      }
    }
    const demo = localStorage.getItem('remindly.demoUser')
    if (demo) return (JSON.parse(demo) as { email?: string }).email ?? 'demo'
  } catch {
    /* ignore */
  }
  return null
}

export function lastLocalUser(): string | null {
  try {
    return localStorage.getItem(LAST_USER)
  } catch {
    return null
  }
}

/** Remove every per-account key (theme and flags stay). */
export function clearLocalData() {
  try {
    const doomed: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('remindly.') && !KEEP_ACROSS_USERS.has(key) && key !== 'remindly.demoUser') doomed.push(key)
    }
    doomed.forEach(k => localStorage.removeItem(k))
    localStorage.removeItem(LAST_USER)
  } catch {
    /* private mode */
  }
}

export function wipeLocalDataForUserSwitch(nextUser: string | null) {
  try {
    const last = localStorage.getItem(LAST_USER)
    if (nextUser && last && last !== nextUser) {
      const doomed: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('remindly.') && !KEEP_ACROSS_USERS.has(key) && key !== 'remindly.demoUser') doomed.push(key)
      }
      doomed.forEach(k => localStorage.removeItem(k))
    }
    if (nextUser) localStorage.setItem(LAST_USER, nextUser)
  } catch {
    /* private mode */
  }
}

wipeLocalDataForUserSwitch(currentUserSync())
