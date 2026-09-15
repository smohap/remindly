import { describe, expect, it } from 'vitest'
import { formatClock, inQuietWindow } from './usePreferences'

const at = (h: number, m = 0) => new Date(2026, 8, 16, h, m)

describe('inQuietWindow', () => {
  it('handles a window that crosses midnight', () => {
    const p = { quietEnabled: true, quietStart: '22:00', quietEnd: '07:00' }
    expect(inQuietWindow(p, at(23))).toBe(true)
    expect(inQuietWindow(p, at(3))).toBe(true)
    expect(inQuietWindow(p, at(7))).toBe(false)
    expect(inQuietWindow(p, at(12))).toBe(false)
  })
  it('handles a same-day window and disabled state', () => {
    const p = { quietEnabled: true, quietStart: '13:00', quietEnd: '14:30' }
    expect(inQuietWindow(p, at(13, 15))).toBe(true)
    expect(inQuietWindow(p, at(14, 30))).toBe(false)
    expect(inQuietWindow({ ...p, quietEnabled: false }, at(13, 15))).toBe(false)
  })
})

describe('formatClock', () => {
  it('renders 12-hour labels', () => {
    expect(formatClock('22:00')).toBe('10 PM')
    expect(formatClock('07:30')).toBe('7:30 AM')
    expect(formatClock('00:00')).toBe('12 AM')
  })
})
