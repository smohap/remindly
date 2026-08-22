import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MapPin, MessageSquare } from 'lucide-react'
import { AuroraBackground } from '../components/AuroraBackground'
import { Brand } from '../components/Brand'
import { Footer } from '../components/Footer'

function PageShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <AuroraBackground />
      <header className="relative z-20 mx-auto flex max-w-[1100px] items-center justify-between px-6 py-5">
        <Brand />
        <Link to="/" className="text-[0.85rem] font-semibold text-[color:var(--ink-dim)] transition hover:text-white">← Home</Link>
      </header>
      <main className="relative z-10 mx-auto max-w-[820px] px-6 py-10">
        <h1 className="font-display text-[2rem] font-bold text-white sm:text-[2.6rem]">{title}</h1>
        {subtitle && <p className="mt-3 text-[0.95rem] text-[color:var(--ink-dim)]">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </main>
      <Footer />
    </div>
  )
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="glass mb-4 p-6">
      <h2 className="font-display mb-2 text-[1.1rem] font-bold text-white">{heading}</h2>
      <div className="space-y-3 text-[0.88rem] leading-relaxed text-[color:var(--ink-dim)]">{children}</div>
    </div>
  )
}

const UPDATED = 'Last updated: 21 August 2026'

export function Terms() {
  return (
    <PageShell title="Terms & Conditions" subtitle={UPDATED}>
      <Section heading="1. Acceptance of terms">
        <p>
          By accessing or using Remindly ("the Service"), you agree to be bound by these Terms & Conditions. If you are
          using the Service on behalf of an organisation, you represent that you have authority to bind that organisation.
        </p>
      </Section>
      <Section heading="2. Use of the Service">
        <p>
          Remindly provides reminder scheduling, notification delivery, and coordination tools. You agree to use the Service
          only for lawful purposes and not to misuse notification channels or send unsolicited messages through the platform.
        </p>
      </Section>
      <Section heading="3. Accounts & roles">
        <p>
          Accounts are organised into three tiers — Super Admin, Group Admin, and User. You are responsible for maintaining
          the confidentiality of your credentials and for all activity that occurs under your account.
        </p>
      </Section>
      <Section heading="4. Subscriptions & billing">
        <p>
          Paid plans are billed per organisation in NZD. Fees are non-refundable except where required by law. We may change
          pricing with 30 days' notice to the billing contact on record.
        </p>
      </Section>
      <Section heading="5. Availability & liability">
        <p>
          We work hard to keep the Service reliable but do not guarantee uninterrupted availability. To the maximum extent
          permitted by law, Remindly is not liable for missed reminders arising from third-party channel outages, device
          settings, or events beyond our reasonable control.
        </p>
      </Section>
      <Section heading="6. Contact">
        <p>
          Questions about these terms? Reach us at <a className="text-white underline" href="mailto:legal@remindly.app">legal@remindly.app</a>.
        </p>
      </Section>
    </PageShell>
  )
}

export function Privacy() {
  return (
    <PageShell title="Privacy Policy" subtitle={UPDATED}>
      <Section heading="1. Information we collect">
        <p>
          We collect the information you provide when creating an account (name, email), the reminders and events you create,
          your notification preferences, and technical data such as device tokens needed to deliver push notifications.
        </p>
      </Section>
      <Section heading="2. How we use your data">
        <p>
          Your data is used to deliver reminders across your chosen channels, provide analytics to your Group and Super Admins
          where applicable, and improve the Service. We do not sell your personal information.
        </p>
      </Section>
      <Section heading="3. Data residency">
        <p>
          Enterprise customers can request a specific data residency region. Other data is processed
          on reputable cloud infrastructure with encryption in transit and at rest.
        </p>
      </Section>
      <Section heading="4. Third-party channels">
        <p>
          When you enable channels such as email, SMS, or Slack, reminder content is shared with those providers solely to
          deliver your notifications, subject to their respective privacy terms.
        </p>
      </Section>
      <Section heading="5. Your rights">
        <p>
          You may access, correct, export, or delete your personal data at any time from your account settings, or by
          contacting us. Deleting your account removes your reminders and preferences from active systems.
        </p>
      </Section>
      <Section heading="6. Contact">
        <p>
          Privacy questions? Email <a className="text-white underline" href="mailto:privacy@remindly.app">privacy@remindly.app</a>.
        </p>
      </Section>
    </PageShell>
  )
}

const COMPANY = 'AIDO Technologies Ltd'

// ===========================================================================
export function About() {
  return (
    <PageShell
      title="About Remindly"
      subtitle="We build the reminder platform we wanted ourselves — one that works for a single person keeping life together, and for a team keeping a business compliant."
    >
      <Section heading="Why we built it">
        <p>
          Reminder apps tend to sit at one extreme or the other. Personal to-do apps are lovely but fall apart the moment
          other people are involved. Enterprise suites handle teams but are far too heavy for a family, a sports club, or
          a five-person business.
        </p>
        <p>
          Remindly sits in the middle. The same engine that nudges you about your passport renewal also escalates an
          unacknowledged safety checklist to a site manager.
        </p>
      </Section>
      <Section heading="Who it's for">
        <p>
          <b className="text-white">Individuals and families</b> — renewals, subscriptions, bills, birthdays, medication,
          and a shared household list everyone can see.
        </p>
        <p>
          <b className="text-white">Teams and organisations</b> — group coordination, certifications, contracts, filing
          deadlines, and an audit trail when something has to be proven.
        </p>
      </Section>
      <Section heading="The company">
        <p>
          Remindly is a product of <b className="text-white">{COMPANY}</b>. We're a small team that believes software
          should be honest about what it does — which is why our roadmap is public and our limitations are written down.
        </p>
        <p>
          Questions, feedback or partnership ideas:{' '}
          <a className="text-white underline" href="mailto:hello@remindly.app">hello@remindly.app</a>
        </p>
      </Section>
    </PageShell>
  )
}

// ===========================================================================
const FEATURE_GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Core reminders — free on every plan',
    items: [
      ['Smart lists', 'Today, Tomorrow, Next 7 days and Overdue, organised automatically.'],
      ['Natural-language add', 'Type "remind me to renew the passport on 20 August 2026" and it schedules itself.'],
      ['Calendar views', 'Day, week, month and year, with navigation across any period.'],
      ['Personal alarm', 'Bypass silent and Do Not Disturb for the things that really matter.'],
      ['Quiet hours', 'Hold non-urgent reminders back; compliance always breaks through.'],
      ['Browser notifications', 'Nudges every 15 minutes until acknowledged — from an hour before timed reminders.'],
      ['Edit and delete', 'Full control over any reminder you created.'],
      ['Groups', 'Create groups, invite members and coordinate together.'],
    ],
  },
  {
    title: 'Premium — for individuals',
    items: [
      ['Renewal Vault', 'Passports, licences, WOF and insurance with colour-coded expiry countdowns.'],
      ['Subscription tracker', 'See total monthly and yearly spend, and get warned before each charge.'],
      ['Workspace', 'Unlimited lists, notes and bookmarks, plus shared lists.'],
      ['Diary', 'A private daily journal with mood tracking.'],
      ['Creative writing', 'Stories and poems, with one-tap sharing to social platforms.'],
      ['Event planner', 'Plan an event as dated tasks with dependencies and a Gantt chart.'],
      ['Invoicing', 'Send an invoice to another member, settle or dispute it, with a full audit trail.'],
      ['Calendar connections', 'Set up Google, Outlook and Apple calendar links.'],
    ],
  },
  {
    title: 'Premium — for teams and organisations',
    items: [
      ['Group chat', 'Discuss reminders where the work actually happens.'],
      ['Compliance mode', 'Mandatory acknowledgement with a two-hop escalation chain.'],
      ['Admin console', 'Manage people, roles, group membership and invitations.'],
      ['Audit log', 'An append-only record of every administrative action.'],
      ['Analytics', 'Acknowledgement rates, open escalations and who needs chasing.'],
      ['Certification tracking', 'Staff certifications with 60/30/7-day expiry warnings.'],
      ['Contract lifecycle', 'Notice deadlines and expiry — auto-renewing contracts still prompt a decision.'],
      ['Filing deadlines', 'GST and PAYE with the correct IRD cycles built in.'],
      ['Project planner', 'Gantt charts with dependencies, conflict detection and critical path.'],
    ],
  },
]

export function Features() {
  return (
    <PageShell
      title="Everything Remindly does"
      subtitle="One reminder engine, two ways to use it. Start free and add the toolkit that matches your world."
    >
      {FEATURE_GROUPS.map(g => (
        <div key={g.title} className="mb-8">
          <h2 className="font-display mb-3 text-[1.2rem] font-bold text-white">{g.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.items.map(([name, desc]) => (
              <div key={name} className="glass p-4">
                <div className="mb-1 text-[0.9rem] font-bold text-white">✓ {name}</div>
                <p className="text-[0.82rem] leading-relaxed text-[color:var(--ink-dim)]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="glass flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-[0.9rem] text-[color:var(--ink-dim)]">Not seeing what you need? Check what's coming next.</p>
        <Link to="/roadmap" className="rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-6 py-3 text-[0.9rem] font-bold text-[#1a1240]">
          View the roadmap
        </Link>
      </div>
    </PageShell>
  )
}

// ===========================================================================
const ROADMAP: { stage: string; tone: string; items: [string, string][] }[] = [
  {
    stage: '⏳ In progress',
    tone: 'text-[#FCD770]',
    items: [
      ['Cross-device sync', 'Workspace, planner and business records currently save per device; moving them fully server-side.'],
      ['Real calendar sync', 'The Google, Outlook and Apple connection flow is built; live two-way OAuth sync is still to come.'],
      ['Escalation automation', 'Escalation chains are configurable today, but the scheduled job that raises them automatically is not live.'],
    ],
  },
  {
    stage: '○ Next up',
    tone: 'text-[color:var(--ink-dim)]',
    items: [
      ['Push, SMS and Slack delivery', 'Today reminders arrive as browser notifications; native push, SMS and Slack are planned.'],
      ['AI Reminder Copilot', 'Our parser understands dates and recurrence; a full AI assistant that drafts and schedules for you is next.'],
      ['Medication reminders', 'Dose schedules with adherence tracking and refill prompts.'],
      ['Location-triggered reminders', 'Geofenced nudges — "remind me when I get to the office".'],
      ['Subscription auto-detection', 'Detect recurring charges from a linked bank account or inbox, with your approval.'],
      ['Approval workflow screen', 'The data model for admin approval of member reminders exists; the review queue UI is still to build.'],
    ],
  },
  {
    stage: '○ Planned',
    tone: 'text-[color:var(--ink-faint)]',
    items: [
      ['Gift & Occasion Concierge', 'AI gift suggestions, one-tap ordering and e-gift cards for birthdays and anniversaries.'],
      ['Voice assistants', 'Siri Shortcuts and Google Assistant for hands-free reminders.'],
      ['Shift and roster reminders', 'Rosters, swap requests and no-show escalation.'],
      ['Customer appointment reminders', 'Branded SMS and email reminders to your customers, with confirm and reschedule links.'],
      ['REST API and webhooks', 'Integrate Remindly with your own systems.'],
      ['Zapier and HRIS integrations', 'Connect to thousands of apps and sync staff lists automatically.'],
      ['White-label branding', 'Your logo and colours on customer-facing notifications.'],
      ['Multi-location broadcast', 'Franchise-wide announcements with per-location acknowledgement tracking.'],
      ['Multilingual notifications', 'Each person reads reminders in their own language.'],
      ['Native mobile apps', 'iOS and Android apps with true background notifications.'],
      ['Two-factor authentication and SSO', 'Stronger sign-in for teams that need it.'],
      ['Data export', 'Self-service export of everything you have stored.'],
    ],
  },
]

export function Roadmap() {
  return (
    <PageShell
      title="Roadmap"
      subtitle="What's live, what we're building, and what's still ahead. We publish this because it's more useful to know what a product can't do yet than to find out later."
    >
      <div className="glass mb-6 p-5">
        <p className="text-[0.85rem] leading-relaxed text-[color:var(--ink-dim)]">
          Everything on the <Link to="/features" className="text-white underline">Features</Link> page works today.
          Everything below does not yet.
        </p>
      </div>
      {ROADMAP.map(section => (
        <div key={section.stage} className="mb-8">
          <h2 className={`font-display mb-3 text-[1.15rem] font-bold ${section.tone}`}>{section.stage}</h2>
          <div className="flex flex-col gap-2">
            {section.items.map(([name, desc]) => (
              <div key={name} className="glass p-4">
                <div className="text-[0.9rem] font-bold text-white">{name}</div>
                <p className="mt-1 text-[0.82rem] leading-relaxed text-[color:var(--ink-dim)]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </PageShell>
  )
}

// ===========================================================================
const PLANS: { name: string; price: string; unit: string; who: string; highlight?: boolean; features: string[] }[] = [
  {
    name: 'Free', price: '$0', unit: 'forever', who: 'Anyone getting started',
    features: ['Core reminders and smart lists', 'Personal alarm and quiet hours', 'Natural-language add', 'Calendar views', '5 lists, 10 notes, 50 bookmarks', 'Groups and shared reminders'],
  },
  {
    name: 'Personal Plus', price: '$9.99', unit: 'per month', who: 'Individuals and families', highlight: true,
    features: ['Everything in Free, unlimited', 'Renewal Vault and subscription tracker', 'Diary and creative writing', 'Event planner with Gantt charts', 'Invoicing', 'Calendar connections', 'Household sharing'],
  },
  {
    name: 'Team', price: '$49', unit: 'per org / month', who: 'Small teams and clubs',
    features: ['Everything in Personal Plus', 'Group chat', 'Admin console and roles', 'Up to 100 members', 'Shared group lists', 'Audit log'],
  },
  {
    name: 'Growth', price: '$149', unit: 'per org / month', who: 'Compliance-driven businesses',
    features: ['Everything in Team', 'Compliance mode and escalation', 'Certification and contract tracking', 'GST / PAYE filing deadlines', 'Analytics dashboard', 'Unlimited members'],
  },
]

export function Pricing() {
  return (
    <PageShell title="Pricing" subtitle="Start free, and pay only when you need the toolkit that matches how you work. Prices in NZD, excluding GST.">
      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS.map(p => (
          <div key={p.name} className="glass flex flex-col p-6" style={p.highlight ? { borderColor: 'rgba(124,111,255,0.6)' } : undefined}>
            {p.highlight && (
              <span className="mb-3 self-start rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-2.5 py-1 text-[0.6rem] font-extrabold uppercase tracking-[0.08em] text-[#1a1240]">
                Most popular
              </span>
            )}
            <div className="font-display text-[1.1rem] font-bold text-white">{p.name}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-display text-[1.9rem] font-extrabold text-white">{p.price}</span>
              <span className="text-[0.72rem] text-[color:var(--ink-faint)]">{p.unit}</span>
            </div>
            <div className="mt-1 text-[0.75rem] text-[color:var(--ink-faint)]">{p.who}</div>
            <ul className="mt-4 flex flex-1 flex-col gap-2">
              {p.features.map(f => (
                <li key={f} className="text-[0.82rem] text-[color:var(--ink-dim)]">✓ {f}</li>
              ))}
            </ul>
            <Link to="/login" className="mt-5 rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] py-2.5 text-center text-[0.85rem] font-bold text-[#1a1240]">
              Get started
            </Link>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Section heading="Enterprise">
          <p>
            Need white-labelling, an API, data residency or an SLA? Those are on our{' '}
            <Link to="/roadmap" className="text-white underline">roadmap</Link>. Talk to us about early access at{' '}
            <a className="text-white underline" href="mailto:sales@remindly.app">sales@remindly.app</a>.
          </p>
        </Section>
      </div>
    </PageShell>
  )
}

// ===========================================================================
export function Security() {
  return (
    <PageShell title="Security" subtitle="How we protect your account and your data — including the parts we're still working on.">
      <Section heading="Authentication">
        <p>
          Sign in with an email and password or with Google. Authentication is handled by Supabase Auth; we never see or
          store your Google password, and passwords are hashed, never kept in plain text.
        </p>
      </Section>
      <Section heading="Data isolation">
        <p>
          Every table enforces row-level security in the database itself. Your reminders, notes and invoices are visible
          only to you — and group data only to that group's members. These rules are enforced on the server, so they apply
          no matter how the data is requested.
        </p>
      </Section>
      <Section heading="Roles and permissions">
        <p>
          Remindly has three tiers: User, Group Admin and Super Admin. Role changes can only be made by a Super Admin, and
          never to their own account — a rule enforced by a database trigger, not just hidden buttons.
        </p>
      </Section>
      <Section heading="Audit trail">
        <p>
          Administrative actions — role changes, invitations, member removals — are written to an append-only audit log.
          Entries cannot be edited or deleted by anyone, which is what makes the record trustworthy.
        </p>
      </Section>
      <Section heading="Encryption and hosting">
        <p>
          All traffic is served over HTTPS. Data is encrypted in transit and at rest by our infrastructure providers,
          Supabase and Vercel.
        </p>
      </Section>
      <Section heading="What we're still building">
        <p>
          We think it's more useful to tell you this than to leave it out: two-factor authentication, single sign-on,
          customer-managed data residency and formal certification such as SOC 2 are on our{' '}
          <Link to="/roadmap" className="text-white underline">roadmap</Link>, not in place today.
        </p>
        <p>
          Found a vulnerability? Email{' '}
          <a className="text-white underline" href="mailto:security@remindly.app">security@remindly.app</a> — we'll
          acknowledge within two business days.
        </p>
      </Section>
    </PageShell>
  )
}

// ===========================================================================
const FAQS: [string, string][] = [
  ['Is Remindly free?', 'Yes. The core reminder engine — smart lists, natural-language adding, calendar views, personal alarm and quiet hours — is free forever, including 5 lists, 10 notes and 50 bookmarks. Premium adds unlimited items plus the individual and business toolkits.'],
  ['Do I need an account for my whole family or team?', 'Each person signs up individually, then you invite them to a group. Group members see shared reminders and group chat; personal reminders stay private to each person.'],
  ['How do notifications work?', 'Remindly sends browser notifications on laptops and Android. A reminder with a specific time starts nudging an hour beforehand; an all-day reminder starts that morning. Either way it repeats every 15 minutes until you acknowledge it.'],
  ['Why am I not getting notifications on my iPhone?', 'Safari only delivers web notifications when a site has been added to the Home Screen. Open Remindly in Safari, tap Share, then "Add to Home Screen", and enable notifications from Settings inside the app.'],
  ['Does calendar sync really connect to Google or Outlook?', 'Not yet. You can set up and configure connections, but live two-way sync is still in development — see the roadmap. We would rather say so than let you assume your calendar is syncing.'],
  ['Can I use Remindly on my phone?', 'Yes. Remindly is a responsive web app with a native-feeling mobile layout — bottom tab bar, swipe to acknowledge or snooze, and bottom sheets. Native app store apps are on the roadmap.'],
  ['What happens to my data if I stop paying?', 'Your data is never deleted because a subscription lapses. You keep read access to everything and revert to the free limits for creating new items.'],
  ['Can I export my data?', 'You can delete your account and its data at any time from Settings. A full self-service export is on our roadmap; in the meantime email us and we will send you your data.'],
  ['Who can see my diary and personal notes?', 'Only you. Diary entries, personal notes and private lists are scoped to your account at the database level. Sharing is always something you turn on deliberately.'],
  ['How do escalations work?', 'A group admin sets a compliance policy: how many hours an unacknowledged reminder waits before escalating to them, and how long again before it reaches a Super Admin. Every step is recorded in the audit log.'],
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <PageShell title="Help & FAQ" subtitle="Straight answers about how Remindly works — including what it can't do yet.">
      <div className="flex flex-col gap-2">
        {FAQS.map(([q, a], i) => (
          <div key={q} className="glass overflow-hidden">
            <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center gap-3 p-5 text-left" aria-expanded={open === i}>
              <span className="flex-1 text-[0.92rem] font-bold text-white">{q}</span>
              <span className="shrink-0 text-[color:var(--ink-faint)]">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && <p className="border-t border-white/10 px-5 py-4 text-[0.86rem] leading-relaxed text-[color:var(--ink-dim)]">{a}</p>}
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Section heading="Still stuck?">
          <p>
            Email <a className="text-white underline" href="mailto:hello@remindly.app">hello@remindly.app</a> or use the{' '}
            <Link to="/contact" className="text-white underline">contact form</Link>. We reply within one business day.
          </p>
        </Section>
      </div>
    </PageShell>
  )
}

// ===========================================================================
export function Cookies() {
  return (
    <PageShell title="Cookie Policy" subtitle={UPDATED}>
      <Section heading="1. What we use">
        <p>
          Remindly uses the minimum storage needed to work. We do not use advertising cookies, and we do not sell data to
          anyone.
        </p>
      </Section>
      <Section heading="2. Strictly necessary">
        <p>
          <b className="text-white">Session cookies</b> keep you signed in. Without these you would be signed out on every
          page load.
        </p>
        <p>
          <b className="text-white">Local storage</b> holds your preferences and a working copy of your data, so the app
          stays usable offline and feels instant.
        </p>
      </Section>
      <Section heading="3. Analytics">
        <p>
          We use privacy-respecting aggregate analytics to understand which features are used. This does not build a
          profile of you and is not shared with advertisers.
        </p>
      </Section>
      <Section heading="4. Managing cookies">
        <p>
          You can clear cookies and local storage from your browser settings at any time. Clearing them signs you out and
          removes any data that has not yet synced to your account.
        </p>
      </Section>
    </PageShell>
  )
}

// ===========================================================================
export function AcceptableUse() {
  return (
    <PageShell title="Acceptable Use Policy" subtitle={UPDATED}>
      <Section heading="1. The short version">
        <p>Use Remindly to organise your life and your work. Don't use it to harm, deceive or spam anyone.</p>
      </Section>
      <Section heading="2. You must not">
        <p>— Send unsolicited bulk messages, marketing or spam through any Remindly channel.</p>
        <p>— Impersonate another person or organisation, including in invoices and group messages.</p>
        <p>— Upload or share unlawful, harassing, hateful or infringing content.</p>
        <p>— Attempt to access another user's account or data, or probe our systems without written permission.</p>
        <p>— Resell or redistribute the service without an agreement with us.</p>
        <p>— Use the invoicing feature to solicit payments fraudulently.</p>
      </Section>
      <Section heading="3. Group and admin responsibilities">
        <p>
          Group Admins can see acknowledgement data for reminders they assign. Use that visibility for coordination and
          compliance, not for surveillance of individuals.
        </p>
      </Section>
      <Section heading="4. Enforcement">
        <p>
          We may suspend or terminate accounts that breach this policy, and will cooperate with lawful requests from
          authorities. Where practical we will contact you first.
        </p>
        <p>
          Report abuse to <a className="text-white underline" href="mailto:abuse@remindly.app">abuse@remindly.app</a>.
        </p>
      </Section>
    </PageShell>
  )
}

// ===========================================================================
export function Contact() {
  const [sent, setSent] = useState(false)
  return (
    <PageShell title="Contact Us" subtitle="We'd love to hear from you — questions, demos, or partnership ideas.">
      <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-4">
          <div className="glass flex items-start gap-3 p-5">
            <Mail size={18} className="mt-0.5 shrink-0 text-[color:var(--cyan)]" />
            <div>
              <div className="text-[0.85rem] font-bold text-white">Email</div>
              <a className="text-[0.85rem] text-[color:var(--ink-dim)] hover:text-white" href="mailto:hello@remindly.app">hello@remindly.app</a>
            </div>
          </div>
          <div className="glass flex items-start gap-3 p-5">
            <MessageSquare size={18} className="mt-0.5 shrink-0 text-[color:var(--violet)]" />
            <div>
              <div className="text-[0.85rem] font-bold text-white">Sales &amp; demos</div>
              <a className="text-[0.85rem] text-[color:var(--ink-dim)] hover:text-white" href="mailto:sales@remindly.app">sales@remindly.app</a>
            </div>
          </div>
          <div className="glass flex items-start gap-3 p-5">
            <MapPin size={18} className="mt-0.5 shrink-0 text-[color:var(--magenta)]" />
            <div>
              <div className="text-[0.85rem] font-bold text-white">Office</div>
              <div className="text-[0.85rem] text-[color:var(--ink-dim)]">Auckland, New Zealand</div>
            </div>
          </div>
        </div>

        <div className="glass p-6">
          {sent ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
              <span className="text-3xl">✅</span>
              <h3 className="font-display text-[1.1rem] font-bold text-white">Thanks — message received</h3>
              <p className="text-[0.85rem] text-[color:var(--ink-dim)]">We'll get back to you within one business day.</p>
            </div>
          ) : (
            <form
              onSubmit={e => {
                e.preventDefault()
                setSent(true)
              }}
              className="flex flex-col gap-3"
            >
              <input required placeholder="Your name" autoComplete="name"
                className="rounded-[14px] border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-3 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)]" />
              <input required type="email" placeholder="Your email" autoComplete="email"
                className="rounded-[14px] border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-3 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)]" />
              <textarea required rows={4} placeholder="How can we help?"
                className="resize-none rounded-[14px] border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-3 text-base text-white outline-none placeholder:text-[color:var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)]" />
              <button
                type="submit"
                className="mt-1 cursor-pointer rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] py-3 text-[0.9rem] font-bold text-[#1a1240] transition hover:brightness-110"
              >
                Send message
              </button>
            </form>
          )}
        </div>
      </div>
    </PageShell>
  )
}
