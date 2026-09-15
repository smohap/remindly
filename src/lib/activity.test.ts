import { describe, expect, it } from 'vitest'
import { appendEntry, type ActivityEntry } from './activityStore'

describe('appendEntry', () => {
  it('prepends newest first and defaults to unread', () => {
    const a = appendEntry([], { kind: 'reminder.due', title: 'Pay rent' }, '2026-09-16T09:00:00.000Z')
    const b = appendEntry(a, { kind: 'reminder.acknowledged', title: 'Pay rent', read: true }, '2026-09-16T10:00:00.000Z')
    expect(b.map(e => e.kind)).toEqual(['reminder.acknowledged', 'reminder.due'])
    expect(b[1].read).toBe(false)
    expect(b[0].read).toBe(true)
    expect(b[0].at).toBe('2026-09-16T10:00:00.000Z')
  })
  it('caps the log at 500 entries', () => {
    let entries: ActivityEntry[] = []
    for (let i = 0; i < 520; i++) entries = appendEntry(entries, { kind: 'reminder.added', title: `r${i}` })
    expect(entries).toHaveLength(500)
    expect(entries[0].title).toBe('r519')
  })
})
