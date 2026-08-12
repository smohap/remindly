import type { DiscoverEvent, Reminder } from './types'

export const seedReminders: Reminder[] = [
  {
    id: 'r1',
    title: 'Submit weekly safety checklist',
    tag: 'Compliance · Ack required',
    meta: 'Acme · Site A crew · Due 5:00 PM · escalates to Group Admin in 2h if unacknowledged',
    category: 'compliance',
    icon: '📋',
    dayOffset: 0,
    time: '5:00 PM',
    acknowledged: false,
    // Created by the Group Admin, so it can't be edited or deleted here.
    ownedByMe: false,
  },
  {
    id: 'r2',
    title: 'Rugby practice — bring boots',
    meta: 'Wellington Rugby · Today, 6:30 PM · Lead time 1 hour',
    category: 'group',
    icon: '🏉',
    dayOffset: 0,
    time: '6:30 PM',
    acknowledged: false,
  },
  {
    id: 'r3',
    title: "Mum's birthday — call her",
    meta: 'Personal · Today, all day · Personal alarm on',
    category: 'personal',
    icon: '🎂',
    dayOffset: 0,
    acknowledged: false,
    ownedByMe: true,
    daily: true,
  },
  {
    id: 'r4',
    title: 'Toolbox talk — Site A briefing',
    meta: 'Acme · Site A crew · Tomorrow, 7:30 AM · Lead time 30 min',
    category: 'group',
    icon: '🦺',
    dayOffset: 1,
    time: '7:30 AM',
    acknowledged: false,
  },
  {
    id: 'r5',
    title: 'Pay car registration',
    meta: 'Personal · Tomorrow, 9:00 AM',
    category: 'personal',
    icon: '🚗',
    dayOffset: 1,
    time: '9:00 AM',
    acknowledged: false,
    ownedByMe: true,
  },
  {
    id: 'r6',
    title: 'Client contract renewal — sign by 5pm',
    tag: 'Escalated to Super Admin',
    meta: 'Acme · Site A crew · Was due yesterday, 5:00 PM',
    category: 'compliance',
    icon: '⚠️',
    dayOffset: -1,
    acknowledged: false,
    resolveLabel: 'Resolve now',
  },
]

export const groups = [
  { name: 'Acme · Site A crew', color: 'var(--red)' },
  { name: 'Wellington Rugby', color: 'var(--teal)' },
  { name: 'Personal', color: 'var(--violet)' },
]

export const discoverEvents: DiscoverEvent[] = [
  {
    id: 'd1',
    title: 'Acme all-hands — quarterly briefing',
    scope: 'Acme · Site A crew',
    meta: 'Next: Fri 24 July, 10:00 AM · repeats quarterly',
    icon: '🏢',
  },
  {
    id: 'd2',
    title: 'Wellington Rugby — season fixtures',
    scope: 'Wellington Rugby',
    meta: '14 events · Saturdays through September',
    icon: '🏉',
  },
  {
    id: 'd3',
    title: 'GST return due dates (NZ)',
    scope: 'Platform',
    meta: 'Next: 28 July · repeats every 2 months',
    icon: '🧾',
  },
  {
    id: 'd4',
    title: 'School term 3 key dates',
    scope: 'Platform',
    meta: '6 events · starts 21 July',
    icon: '🎒',
  },
  {
    id: 'd5',
    title: 'Wellington City Marathon — training plan',
    scope: 'Platform',
    meta: '12-week reminder journey · starts 4 August',
    icon: '🏃',
  },
]
