import { describe, expect, it } from 'vitest'
import { FEATURE_MIN_PLAN, PLANS, planAllows, planForFeature, planLabel, type Feature } from './plans'

describe('planAllows', () => {
  it('free cannot use premium features', () => {
    expect(planAllows('free', 'vault')).toBe(false)
    expect(planAllows('free', 'business')).toBe(false)
  })
  it('plus unlocks personal premium but not team features', () => {
    expect(planAllows('plus', 'vault')).toBe(true)
    expect(planAllows('plus', 'invoices')).toBe(true)
    expect(planAllows('plus', 'group_chat')).toBe(false)
  })
  it('team unlocks group features but not business', () => {
    expect(planAllows('team', 'group_chat')).toBe(true)
    expect(planAllows('team', 'admin_console')).toBe(true)
    expect(planAllows('team', 'business')).toBe(false)
  })
  it('growth unlocks everything', () => {
    for (const f of Object.keys(FEATURE_MIN_PLAN) as Feature[]) expect(planAllows('growth', f)).toBe(true)
  })
})

describe('planForFeature', () => {
  it('names the cheapest plan that includes a feature', () => {
    expect(planForFeature('vault')).toBe('plus')
    expect(planForFeature('group_chat')).toBe('team')
    expect(planForFeature('business')).toBe('growth')
  })
})

describe('PLANS catalogue', () => {
  it('lists the four public plans in order with NZD prices', () => {
    expect(PLANS.map(p => p.id)).toEqual(['free', 'plus', 'team', 'growth'])
    expect(planLabel('plus')).toBe('Personal Plus')
    expect(PLANS.find(p => p.id === 'plus')?.priceLabel).toBe('$9.99')
  })
})
