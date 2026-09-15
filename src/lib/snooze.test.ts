import { describe, expect, it } from 'vitest'
import { SNOOZE_OPTIONS, isSnoozed, snoozeLabel, snoozeUntil } from './snooze'

const now = new Date(2026, 8, 16, 14, 30) // Wed 16 Sep 2026, 2:30 PM local

describe('snoozeUntil', () => {
  it('1 hour from now', () => {
    expect(snoozeUntil('hour', now)).toBe(new Date(2026, 8, 16, 15, 30).toISOString())
  })
  it('this evening is 6 PM today, or tomorrow if that has passed', () => {
    expect(snoozeUntil('evening', now)).toBe(new Date(2026, 8, 16, 18, 0).toISOString())
    expect(snoozeUntil('evening', new Date(2026, 8, 16, 19, 0))).toBe(new Date(2026, 8, 17, 18, 0).toISOString())
  })
  it('tomorrow morning is 9 AM tomorrow', () => {
    expect(snoozeUntil('tomorrow', now)).toBe(new Date(2026, 8, 17, 9, 0).toISOString())
  })
  it('next week is 9 AM next Monday', () => {
    expect(snoozeUntil('nextWeek', now)).toBe(new Date(2026, 8, 21, 9, 0).toISOString())
    // From a Monday, next week is the following Monday, not today
    expect(snoozeUntil('nextWeek', new Date(2026, 8, 21, 10, 0))).toBe(new Date(2026, 8, 28, 9, 0).toISOString())
  })
})

describe('isSnoozed', () => {
  it('is true only while the snooze is in the future', () => {
    expect(isSnoozed(new Date(2026, 8, 16, 15, 0).toISOString(), now)).toBe(true)
    expect(isSnoozed(new Date(2026, 8, 16, 14, 0).toISOString(), now)).toBe(false)
    expect(isSnoozed(undefined, now)).toBe(false)
    expect(isSnoozed('not a date', now)).toBe(false)
  })
})

describe('snoozeLabel', () => {
  it('describes when a snooze ends', () => {
    expect(snoozeLabel(new Date(2026, 8, 16, 18, 0).toISOString(), now)).toBe('until 6:00 PM')
    expect(snoozeLabel(new Date(2026, 8, 17, 9, 0).toISOString(), now)).toBe('until tomorrow 9:00 AM')
    expect(snoozeLabel(new Date(2026, 8, 21, 9, 0).toISOString(), now)).toBe('until Mon 21 Sep, 9:00 AM')
  })
  it('exposes four options', () => {
    expect(SNOOZE_OPTIONS.map(o => o.key)).toEqual(['hour', 'evening', 'tomorrow', 'nextWeek'])
  })
})
