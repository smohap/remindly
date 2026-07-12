export type Category = 'compliance' | 'group' | 'personal'

export interface Reminder {
  id: string
  title: string
  meta: string
  category: Category
  tag?: string
  icon: string
  /** Days from today: -1 = yesterday (overdue), 0 = today, 1 = tomorrow… */
  dayOffset: number
  time?: string
  acknowledged: boolean
  snoozedUntil?: string
  resolveLabel?: string
}

export type Filter = 'today' | 'tomorrow' | 'week' | 'overdue'

export type Tab = 'today' | 'calendar' | 'discover' | 'notifications' | 'history' | 'settings' | 'groups' | 'profile'

export type ToggleKey = 'personalAlarm' | 'push' | 'email' | 'sms' | 'slack' | 'quietHours'

export interface DiscoverEvent {
  id: string
  title: string
  scope: string
  meta: string
  icon: string
}
