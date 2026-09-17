import { describe, expect, it } from 'vitest'
import { RECURRENCES, describeRecurrence, effectiveDueDate, nextOccurrence, occurrencesInRange } from './recurrence'

describe('nextOccurrence', () => {
  it('advances by the cadence', () => {
    expect(nextOccurrence('2026-09-16', 'daily', '2026-09-16')).toBe('2026-09-17')
    expect(nextOccurrence('2026-09-16', 'weekly', '2026-09-16')).toBe('2026-09-23')
    expect(nextOccurrence('2026-09-16', 'fortnightly', '2026-09-16')).toBe('2026-09-30')
    expect(nextOccurrence('2026-09-16', 'monthly', '2026-09-16')).toBe('2026-10-16')
    expect(nextOccurrence('2026-09-16', 'yearly', '2026-09-16')).toBe('2027-09-16')
  })
  it('clamps month-end and leap days', () => {
    expect(nextOccurrence('2026-01-31', 'monthly', '2026-01-31')).toBe('2026-02-28')
    expect(nextOccurrence('2024-02-29', 'yearly', '2024-02-29')).toBe('2025-02-28')
  })
  it('weekdays skip the weekend', () => {
    expect(nextOccurrence('2026-09-18', 'weekdays', '2026-09-18')).toBe('2026-09-21') // Fri -> Mon
    expect(nextOccurrence('2026-09-16', 'weekdays', '2026-09-16')).toBe('2026-09-17')
  })
  it('always lands strictly after from, even when the reminder was overdue', () => {
    expect(nextOccurrence('2026-08-01', 'weekly', '2026-09-16')).toBe('2026-09-19')
    expect(nextOccurrence('2026-01-15', 'monthly', '2026-09-16')).toBe('2026-10-15')
  })
})

describe('describeRecurrence', () => {
  it('has a label for every cadence', () => {
    for (const r of RECURRENCES) expect(describeRecurrence(r.value)).toBeTruthy()
    expect(describeRecurrence('fortnightly')).toBe('Every fortnight')
  })
})

describe('occurrencesInRange', () => {
  it('lists every repetition inside the window', () => {
    expect(occurrencesInRange('2026-09-16', 'weekly', '2026-09-01', '2026-10-07')).toEqual(['2026-09-16', '2026-09-23', '2026-09-30', '2026-10-07'])
    expect(occurrencesInRange('2026-01-31', 'monthly', '2026-02-01', '2026-04-30')).toEqual(['2026-02-28', '2026-03-31', '2026-04-30'])
  })
  it('one-off reminders appear once, and only if inside the window', () => {
    expect(occurrencesInRange('2026-09-16', undefined, '2026-09-01', '2026-09-30')).toEqual(['2026-09-16'])
    expect(occurrencesInRange('2026-09-16', undefined, '2026-10-01', '2026-10-31')).toEqual([])
  })
})

describe('effectiveDueDate', () => {
  const today = '2026-09-17'
  it('leaves future and one-off dates alone', () => {
    expect(effectiveDueDate('2026-09-20', 'weekly', today)).toBe('2026-09-20')
    expect(effectiveDueDate('2026-01-01', undefined, today)).toBe('2026-01-01')
  })
  it('a missed occurrence inside the grace window is still overdue', () => {
    expect(effectiveDueDate('2026-09-16', 'daily', today)).toBe('2026-09-17') // an occurrence falls today, so today wins
    expect(effectiveDueDate('2026-09-16', 'weekly', today)).toBe('2026-09-16')
    expect(effectiveDueDate('2026-09-12', 'monthly', today)).toBe('2026-09-12') // 5 days ago, 7-day grace
    expect(effectiveDueDate('2025-09-14', 'yearly', today)).toBe('2026-09-14') // this year's, 3 days ago
  })
  it('past the grace window it moves on to the next occurrence', () => {
    expect(effectiveDueDate('2026-09-10', 'weekly', today)).toBe('2026-09-17') // a week ago: this week's is today
    expect(effectiveDueDate('2026-09-08', 'weekly', today)).toBe('2026-09-22') // 09-15 missed by 2 days > grace → 09-22
    expect(effectiveDueDate('2026-01-05', 'monthly', today)).toBe('2026-10-05') // 09-05 missed by 12 days → 10-05
    expect(effectiveDueDate('2026-03-01', 'daily', today)).toBe('2026-09-17') // today's occurrence
  })
})
