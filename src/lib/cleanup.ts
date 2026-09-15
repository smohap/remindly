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
