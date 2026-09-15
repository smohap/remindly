import { describe, expect, it } from 'vitest'
import { parseReminder } from './nlParse'

const wed = new Date(2026, 8, 16, 10, 0) // Wednesday 16 Sep 2026

describe('parseReminder recurrence', () => {
  it('recognises each cadence', () => {
    expect(parseReminder('pay rent every month', wed).recurrence).toBe('monthly')
    expect(parseReminder('renew passport every year', wed).recurrence).toBe('yearly')
    expect(parseReminder('stand-up daily at 9am', wed).recurrence).toBe('daily')
    expect(parseReminder('water plants every day', wed).recurrence).toBe('daily')
    expect(parseReminder('gym every weekday at 6am', wed).recurrence).toBe('weekdays')
    expect(parseReminder('bins out every week', wed).recurrence).toBe('weekly')
    expect(parseReminder('pay cleaner every fortnight', wed).recurrence).toBe('fortnightly')
    expect(parseReminder('pay cleaner every 2 weeks', wed).recurrence).toBe('fortnightly')
    expect(parseReminder('invoice clients monthly', wed).recurrence).toBe('monthly')
    expect(parseReminder('one-off call mum tomorrow', wed).recurrence).toBeUndefined()
  })

  it('a weekday name schedules the first occurrence on that day', () => {
    const r = parseReminder('team sync every Monday at 10am', wed)
    expect(r.recurrence).toBe('weekly')
    expect(r.dayOffset).toBe(5) // next Monday is 21 Sep
    expect(r.time).toBe('10:00 AM')
    expect(r.title).toBe('Team sync')
  })

  it('every second <weekday> is fortnightly starting that weekday', () => {
    const r = parseReminder('retro every second Tuesday', wed)
    expect(r.recurrence).toBe('fortnightly')
    expect(r.dayOffset).toBe(6) // Tue 22 Sep
    expect(r.title).toBe('Retro')
  })

  it('strips the cadence from the title and describes it in meta', () => {
    const r = parseReminder('gym every weekday at 6am', wed)
    expect(r.title).toBe('Gym')
    expect(r.time).toBe('6:00 AM')
    expect(r.meta).toContain('Every weekday')
  })
})
