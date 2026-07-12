import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  AlarmClock, BellRing, Bot, Building2, CalendarClock, Check, CheckCircle2, Gift,
  MoonStar, User, Users, Zap,
} from 'lucide-react'
import { AuroraBackground } from '../components/AuroraBackground'
import { Brand } from '../components/Brand'
import { Footer } from '../components/Footer'

// The essentials — free on every plan
const features = [
  { icon: Bot, title: 'AI natural-language add', body: 'Type "remind me to submit the safety audit tomorrow at 9am". Remindly parses the date, time, and category for you.' },
  { icon: BellRing, title: 'Multi-channel delivery', body: 'Push, email, SMS, and Slack — each person picks their channels, with delivery confirmation end to end.' },
  { icon: AlarmClock, title: 'Personal alarm mode', body: 'Bypass silent & DND for critical reminders. Loops until dismissed, with your own ringtone.' },
  { icon: MoonStar, title: 'Quiet hours', body: 'Batch non-urgent reminders during your quiet hours — while critical items always break through.' },
  { icon: CalendarClock, title: 'Smart lists & recurrence', body: 'Today, Tomorrow, This week, Overdue — auto-organised, with flexible recurring schedules.' },
  { icon: Users, title: 'Shared groups', body: 'Create groups, invite members, and coordinate reminders across a team, club, or family.' },
]

// Who it's for
const audiences = [
  {
    icon: User,
    color: '#2DD4BF',
    kicker: 'For individuals & families',
    title: 'Keep your whole life on track',
    body: 'Never miss a renewal, a payment, or a birthday. Remindly watches the deadlines you forget about.',
    premium: [
      'Renewal Vault — passports, licences, WOF & insurance before they lapse',
      'Subscription tracker — see total spend, get warned before each charge',
      'Bill & rent reminders with a mark-as-paid history',
      'Household & family plan — shared reminders with per-person status',
      'Gift & Occasion Concierge — AI gift ideas, one-tap ordering & e-gift cards',
      'Medication & location-based reminders',
    ],
  },
  {
    icon: Building2,
    color: '#7C6FFF',
    kicker: 'For businesses & teams',
    title: 'Coordinate people, stay compliant',
    body: 'Route the right reminder to the right person, escalate what gets missed, and keep an audit-ready trail.',
    premium: [
      'Certification & licence tracking with admin escalation',
      'Contract lifecycle — notice-period & expiry reminders',
      'GST / PAYE filing deadlines with NZ IRD cycles built in',
      'Compliance mode with mandatory acknowledgement & audit log',
      'Shift & roster reminders + customer appointment reminders',
      'Analytics, white-label branding & REST API',
    ],
  },
]

// Pricing — split by audience
type Plan = { name: string; price: string; unit: string; highlight?: boolean; cta: string; features: string[] }

const personalPlans: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    unit: 'forever',
    cta: 'Start free',
    features: ['Core reminders & smart lists', 'Personal alarm & quiet hours', 'AI natural-language add', 'Up to 50 reminders / month'],
  },
  {
    name: 'Personal Plus',
    price: '$9.99',
    unit: 'per month',
    highlight: true,
    cta: 'Go Plus',
    features: [
      'Everything in Free, unlimited',
      'Renewal Vault',
      'Subscription tracker & bill reminders',
      'Household & family plan',
      'Gift & Occasion Concierge',
      'Medication & location reminders',
    ],
  },
]

const businessPlans: Plan[] = [
  {
    name: 'Team',
    price: '$49',
    unit: 'per org / month',
    cta: 'Start Team',
    features: ['Core team reminders', 'Groups, roles & shared calendars', 'Multi-channel delivery', 'Up to 100 users'],
  },
  {
    name: 'Growth',
    price: '$149',
    unit: 'per org / month',
    highlight: true,
    cta: 'Start Growth',
    features: [
      'Everything in Team',
      'Certification & contract tracking',
      'GST / PAYE filing reminders',
      'Compliance mode & escalation',
      'Analytics & AI copilot',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    unit: 'contact sales',
    cta: 'Contact sales',
    features: ['Everything in Growth', 'White-label & REST API', 'Franchise / multi-location', 'ANZ data residency & SLA'],
  },
]

const stats = [
  { num: '2', label: 'Ways to use it' },
  { num: '40+', label: 'Reminder types' },
  { num: '4', label: 'Delivery channels' },
  { num: 'NZD', label: 'ANZ-first' },
]

function Nav() {
  return (
    <header className="relative z-20 mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5">
      <Brand />
      <nav className="hidden items-center gap-7 text-[0.85rem] font-semibold text-[color:var(--ink-dim)] md:flex">
        <a href="#audience" className="transition hover:text-white">Who it's for</a>
        <a href="#features" className="transition hover:text-white">Features</a>
        <a href="#pricing" className="transition hover:text-white">Pricing</a>
      </nav>
      <div className="flex items-center gap-3">
        <Link to="/login" className="text-[0.85rem] font-semibold text-white/90 transition hover:text-white">Sign in</Link>
        <Link
          to="/login"
          className="rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-4 py-2 text-[0.82rem] font-bold text-[#1a1240] transition hover:brightness-110"
        >
          Get started
        </Link>
      </div>
    </header>
  )
}

function PricingCard({ plan }: { plan: Plan }) {
  return (
    <div
      className="glass flex flex-col p-6"
      style={plan.highlight ? { borderColor: 'rgba(124,111,255,0.6)', boxShadow: '0 8px 40px rgba(124,111,255,0.25)' } : undefined}
    >
      {plan.highlight && (
        <span className="mb-3 self-start rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-2.5 py-1 text-[0.6rem] font-extrabold uppercase tracking-[0.08em] text-[#1a1240]">
          Most popular
        </span>
      )}
      <div className="font-display text-[1.05rem] font-bold text-white">{plan.name}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-[1.8rem] font-extrabold text-white">{plan.price}</span>
        <span className="text-[0.72rem] text-[color:var(--ink-faint)]">{plan.unit}</span>
      </div>
      <ul className="mt-4 flex flex-1 flex-col gap-2">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-[0.82rem] text-[color:var(--ink-dim)]">
            <Check size={15} className="mt-0.5 shrink-0 text-[color:var(--teal)]" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        to="/login"
        className="mt-5 rounded-full py-2.5 text-center text-[0.82rem] font-bold transition"
        style={
          plan.highlight
            ? { background: 'linear-gradient(135deg,var(--cyan),var(--violet))', color: '#1a1240' }
            : { border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.08)', color: '#fff' }
        }
      >
        {plan.cta}
      </Link>
    </div>
  )
}

export default function Landing() {
  const [audience, setAudience] = useState<'personal' | 'business'>('personal')
  const plans = audience === 'personal' ? personalPlans : businessPlans

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <AuroraBackground />
      <Nav />

      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-[900px] px-6 pb-14 pt-14 text-center sm:pt-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-1.5 text-[0.75rem] font-semibold text-[color:var(--ink-dim)]">
            <Zap size={13} className="text-[color:var(--cyan)]" /> One reminder app for life and work
          </span>
          <h1 className="font-display text-[2.5rem] font-bold leading-[1.05] text-white sm:text-[3.6rem]">
            Never let a deadline,<br />renewal, or payment slip
          </h1>
          <p className="mx-auto mt-5 max-w-[640px] text-[1rem] leading-relaxed text-[color:var(--ink-dim)] sm:text-[1.1rem]">
            Remindly tracks the things you forget about — passport renewals, subscriptions and birthdays for
            <span className="text-white"> individuals</span>, and certifications, contracts and filing deadlines for
            <span className="text-white"> businesses</span> — with smart escalation and a personal alarm that cuts through the noise.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/login" className="w-full rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-7 py-3.5 text-[0.95rem] font-bold text-[#1a1240] transition hover:brightness-110 sm:w-auto">
              Start free
            </Link>
            <a href="#audience" className="w-full rounded-full border border-[color:var(--glass-border)] bg-white/[0.08] px-7 py-3.5 text-[0.95rem] font-semibold text-white transition hover:bg-white/[0.14] sm:w-auto">
              See what it does
            </a>
          </div>
        </motion.div>

        <div className="mt-14 flex flex-wrap justify-center gap-8 border-t border-white/10 pt-8 sm:gap-14">
          {stats.map(s => (
            <div key={s.label}>
              <div className="font-display text-[2rem] font-extrabold text-white">{s.num}</div>
              <div className="text-[0.72rem] uppercase tracking-[0.07em] text-[color:var(--ink-faint)]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* AUDIENCE — who it's for */}
      <section id="audience" className="relative z-10 mx-auto max-w-[1100px] scroll-mt-20 px-6 py-16">
        <h2 className="font-display text-center text-[1.8rem] font-bold text-white sm:text-[2.4rem]">One app, two ways to use it</h2>
        <p className="mx-auto mt-3 max-w-[600px] text-center text-[0.95rem] text-[color:var(--ink-dim)]">
          The core reminder engine is the same. Premium unlocks a purpose-built toolkit for how <em>you</em> use it — at home or at work.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {audiences.map(a => (
            <motion.div
              key={a.kicker}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4 }}
              className="glass relative overflow-hidden p-7"
            >
              <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: a.color }} />
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-[13px]" style={{ background: `${a.color}22`, color: a.color }}>
                  <a.icon size={20} />
                </span>
                <span className="text-[0.72rem] font-bold uppercase tracking-[0.1em]" style={{ color: a.color }}>{a.kicker}</span>
              </div>
              <h3 className="font-display text-[1.3rem] font-bold text-white">{a.title}</h3>
              <p className="mt-2 text-[0.88rem] leading-relaxed text-[color:var(--ink-dim)]">{a.body}</p>
              <div className="mt-4 mb-2 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">
                <span className="rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-2 py-[2px] text-[#1a1240]">Premium</span>
                unlocks
              </div>
              <ul className="flex flex-col gap-2.5">
                {a.premium.map(p => (
                  <li key={p} className="flex items-start gap-2 text-[0.85rem] text-[color:var(--ink-dim)]">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: a.color }} />
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES — free essentials */}
      <section id="features" className="relative z-10 mx-auto max-w-[1100px] scroll-mt-20 px-6 py-16">
        <h2 className="font-display text-center text-[1.8rem] font-bold text-white sm:text-[2.4rem]">The essentials, free forever</h2>
        <p className="mx-auto mt-3 max-w-[560px] text-center text-[0.95rem] text-[color:var(--ink-dim)]">
          Every account gets the full reminder engine. Premium adds the individual and business toolkits above.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.06 }}
              className="glass p-6"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[13px] bg-[linear-gradient(135deg,var(--cyan),var(--violet))] text-[#1a1240]">
                <f.icon size={20} />
              </div>
              <h3 className="font-display mb-1.5 text-[1.05rem] font-bold text-white">{f.title}</h3>
              <p className="text-[0.85rem] leading-relaxed text-[color:var(--ink-dim)]">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PRICING — with audience toggle */}
      <section id="pricing" className="relative z-10 mx-auto max-w-[1100px] scroll-mt-20 px-6 py-16">
        <h2 className="font-display text-center text-[1.8rem] font-bold text-white sm:text-[2.4rem]">Plans for you and your team</h2>
        <p className="mx-auto mt-3 max-w-[560px] text-center text-[0.95rem] text-[color:var(--ink-dim)]">
          Start free. Paid plans unlock the premium toolkit for your world. Prices in NZD.
        </p>

        {/* Personal / Business toggle */}
        <div className="mt-8 flex justify-center">
          <div className="glass inline-flex gap-1 rounded-full p-1">
            {(['personal', 'business'] as const).map(key => {
              const active = audience === key
              return (
                <button
                  key={key}
                  onClick={() => setAudience(key)}
                  className="relative rounded-full px-5 py-2 text-[0.82rem] font-bold transition-colors"
                >
                  {active && <motion.span layoutId="price-toggle" className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))]" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                  <span className={active ? 'relative flex items-center gap-1.5 text-[#1a1240]' : 'relative flex items-center gap-1.5 text-[color:var(--ink-dim)]'}>
                    {key === 'personal' ? <User size={14} /> : <Building2 size={14} />}
                    {key === 'personal' ? 'For individuals' : 'For business'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className={`mx-auto mt-8 grid gap-4 ${audience === 'personal' ? 'max-w-[720px] sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
          {plans.map(plan => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-[900px] px-6 py-16">
        <div className="glass flex flex-col items-center gap-5 p-10 text-center">
          <Gift size={38} className="text-[color:var(--cyan)]" />
          <h2 className="font-display text-[1.8rem] font-bold text-white sm:text-[2.2rem]">Ready to never miss what matters?</h2>
          <p className="max-w-[520px] text-[0.95rem] text-[color:var(--ink-dim)]">
            Whether it's your passport renewal or your team's compliance deadline — Remindly has it covered. Free to start.
          </p>
          <Link to="/login" className="rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-8 py-3.5 text-[0.95rem] font-bold text-[#1a1240] transition hover:brightness-110">
            Create your free account
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
