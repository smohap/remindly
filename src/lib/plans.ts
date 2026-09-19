/**
 * The plan catalogue and feature gating matrix — the single source of truth
 * shared by the public /pricing page, the in-app upgrade chooser, and every
 * feature gate. The server (Stripe webhook → billing_subscriptions) decides
 * what plan a user is on; this file only decides what each plan includes.
 */

export type PlanId = 'free' | 'plus' | 'team' | 'growth'

export const PLAN_ORDER: PlanId[] = ['free', 'plus', 'team', 'growth']

export type Feature =
  | 'vault'
  | 'subscriptions'
  | 'planner'
  | 'invoices'
  | 'diary'
  | 'unlimited_workspace'
  | 'list_sharing'
  | 'group_chat'
  | 'admin_console'
  | 'business'
  | 'analytics'
  | 'group_docs'

/** The cheapest plan that includes each feature. */
export const FEATURE_MIN_PLAN: Record<Feature, PlanId> = {
  vault: 'plus',
  subscriptions: 'plus',
  planner: 'plus',
  invoices: 'plus',
  diary: 'plus',
  unlimited_workspace: 'plus',
  list_sharing: 'plus',
  group_chat: 'plus',
  admin_console: 'team',
  business: 'team',
  analytics: 'team',
  group_docs: 'plus',
}

export const FEATURE_LABEL: Record<Feature, string> = {
  vault: 'Renewal Vault',
  subscriptions: 'Subscription tracker',
  planner: 'Event & project planner',
  invoices: 'Invoicing',
  diary: 'Diary',
  unlimited_workspace: 'Unlimited lists, notes and bookmarks',
  list_sharing: 'Shared lists',
  group_chat: 'Group chat',
  admin_console: 'Admin console',
  business: 'Business compliance suite',
  analytics: 'Analytics dashboard',
  group_docs: 'Group documents',
}

export interface Plan {
  id: PlanId
  name: string
  priceLabel: string
  unit: string
  who: string
  highlight?: boolean
  features: string[]
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    priceLabel: '$0',
    unit: 'forever',
    who: 'Anyone getting started',
    features: [
      'Core reminders and smart lists',
      'Recurring reminders and quiet hours',
      'Natural-language add',
      'Calendar views',
      '5 lists, 10 notes, 50 bookmarks',
      'Groups and shared reminders',
      'Group lists and notes',
    ],
  },
  {
    id: 'plus',
    name: 'Personal Plus',
    priceLabel: '$9.99',
    unit: 'per month',
    who: 'Individuals and families',
    highlight: true,
    features: [
      'Everything in Free, unlimited',
      'Renewal Vault and subscription tracker',
      'Diary',
      'Event planner with Gantt charts',
      'Invoicing',
      'Shared lists',
      'Group chat',
      'Group documents — upload and share files with your group',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    priceLabel: '$49',
    unit: 'per org / month',
    who: 'Small teams and clubs',
    features: [
      'Everything in Personal Plus',
      'Compliance mode and escalation',
      'Certification and contract tracking',
      'GST / PAYE filing deadlines',
      'Analytics dashboard',
      'Admin console, roles and audit log',
      'Up to 100 members',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    priceLabel: '$149',
    unit: 'per org / month',
    who: 'Compliance-driven businesses',
    features: ['Everything in Team', 'Unlimited members', 'Priority support', 'Data export on request'],
  },
]

export function planRank(plan: PlanId): number {
  return PLAN_ORDER.indexOf(plan)
}

export function planAllows(plan: PlanId, feature: Feature): boolean {
  return planRank(plan) >= planRank(FEATURE_MIN_PLAN[feature])
}

export function planForFeature(feature: Feature): PlanId {
  return FEATURE_MIN_PLAN[feature]
}

export function planLabel(plan: PlanId): string {
  return PLANS.find(p => p.id === plan)?.name ?? plan
}

export function isPlanId(v: unknown): v is PlanId {
  return typeof v === 'string' && (PLAN_ORDER as string[]).includes(v)
}
