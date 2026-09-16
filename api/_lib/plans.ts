/** Plan ids, mirrored from src/lib/plans.ts — the function bundle must not reach outside api/. */
export type PlanId = 'free' | 'plus' | 'team' | 'growth'
export const PLAN_IDS: PlanId[] = ['free', 'plus', 'team', 'growth']
export function isPlanId(v: unknown): v is PlanId {
  return typeof v === 'string' && (PLAN_IDS as string[]).includes(v)
}
