import { describe, expect, it } from 'vitest'
import { buildReminder, normaliseTime } from './newReminder'

describe('normaliseTime', () => {
  it('accepts 12h and 24h input', () => {
    expect(normaliseTime('5pm')).toBe('5:00 PM')
    expect(normaliseTime('5:30 PM')).toBe('5:30 PM')
    expect(normaliseTime('17:00')).toBe('5:00 PM')
    expect(normaliseTime('9')).toBe('9:00 AM')
    expect(normaliseTime('12am')).toBe('12:00 AM')
    expect(normaliseTime('')).toBeUndefined()
    expect(normaliseTime('later')).toBeUndefined()
  })
})

describe('buildReminder', () => {
  it('requires a title and date', () => {
    expect(buildReminder({ title: ' ', date: '2026-09-16' })).toBeNull()
    expect(buildReminder({ title: 'x', date: '' })).toBeNull()
  })
  it('produces a fully formed reminder', () => {
    const r = buildReminder({ title: 'pay rent', date: '2099-01-01', time: '9am', recurrence: 'monthly', category: 'personal' }, 'id1')!
    expect(r.title).toBe('Pay rent')
    expect(r.time).toBe('9:00 AM')
    expect(r.recurrence).toBe('monthly')
    expect(r.meta).toContain('Every month')
    expect(r.meta).toContain('9:00 AM')
    expect(r.dayOffset).toBeGreaterThan(0)
    expect(r.acknowledged).toBe(false)
    expect(r.ownedByMe).toBe(true)
  })
})
