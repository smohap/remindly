import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  AlarmClock, BellRing, Bot, CalendarClock, CheckCircle2, Crown, Layers, MapPin,
  MoonStar, ShieldCheck, Users, Zap,
} from 'lucide-react'
import { AuroraBackground } from '../components/AuroraBackground'
import { Brand } from '../components/Brand'
import { Footer } from '../components/Footer'

const features = [
  { icon: Bot, title: 'AI Reminder Copilot', body: 'Type "remind my team about the board report 2 days before quarter end". Remindly parses intent, sets optimal lead times, and drafts the message.' },
  { icon: ShieldCheck, title: 'Compliance mode', body: 'Mandatory acknowledgement, escalation chains, and an immutable audit trail for the reminders that must not be missed.' },
  { icon: BellRing, title: 'Multi-channel delivery', body: 'Push, email, SMS, and Slack — each user picks their channels, with delivery confirmation end to end.' },
  { icon: AlarmClock, title: 'Personal alarm mode', body: 'Bypass silent & DND for critical reminders. Loops until dismissed, with your own ringtone.' },
  { icon: MoonStar, title: 'Quiet hours', body: 'Batch non-urgent reminders during your quiet hours — while compliance items always break through.' },
  { icon: MapPin, title: 'Location triggers', body: '"Remind me when I arrive at the office." Battery-optimised geofencing for site visits and physical checks.' },
]

const roles = [
  { icon: Crown, badge: 'Super Admin', color: '#FBBF24', points: ['Platform-wide events & templates', 'Onboard and manage Group Admins', 'Compliance, audit & billing controls'] },
  { icon: Layers, badge: 'Group Admin', color: '#7C6FFF', points: ['Events scoped to their group', 'Assign reminders & escalation policies', 'Group analytics and membership'] },
  { icon: Users, badge: 'User', color: '#2DD4BF', points: ['Personal alarms & quiet hours', 'Choose notification channels', 'Snooze, acknowledge & subscribe'] },
]

const tiers = [
  { name: 'Free', price: '$0', unit: 'forever', blurb: 'Up to 3 groups, 20 users, 50 events/mo', highlight: false },
  { name: 'Starter', price: '$49', unit: 'per org / mo', blurb: '5 groups, 100 users, unlimited events', highlight: false },
  { name: 'Growth', price: '$149', unit: 'per org / mo', blurb: 'Unlimited groups, AI features, compliance mode', highlight: true },
  { name: 'Enterprise', price: 'Custom', unit: 'contact sales', blurb: 'White-label, API, ANZ data residency, SLA', highlight: false },
]

const stats = [
  { num: '3', label: 'User tiers' },
  { num: '40+', label: 'Core features' },
  { num: '4', label: 'Delivery channels' },
  { num: 'NZD', label: 'ANZ-first' },
]

function Nav() {
  return (
    <header className="relative z-20 mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5">
      <Brand />
      <nav className="hidden items-center gap-7 text-[0.85rem] font-semibold text-[color:var(--ink-dim)] md:flex">
        <a href="#features" className="transition hover:text-white">Features</a>
        <a href="#roles" className="transition hover:text-white">Roles</a>
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

export default function Landing() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <AuroraBackground />
      <Nav />

      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-[900px] px-6 pb-14 pt-14 text-center sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        >
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--glass-border)] bg-white/[0.08] px-4 py-1.5 text-[0.75rem] font-semibold text-[color:var(--ink-dim)]">
            <Zap size={13} className="text-[color:var(--cyan)]" /> The intelligent reminder platform
          </span>
          <h1 className="font-display text-[2.5rem] font-bold leading-[1.05] text-white sm:text-[3.6rem]">
            Never let a critical<br />reminder slip again
          </h1>
          <p className="mx-auto mt-5 max-w-[620px] text-[1rem] leading-relaxed text-[color:var(--ink-dim)] sm:text-[1.1rem]">
            Remindly bridges personal deadlines, group coordination, and enterprise-grade notification management —
            with smart escalation, AI-assisted scheduling, and a personal alarm that cuts through the noise.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className="w-full rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-7 py-3.5 text-[0.95rem] font-bold text-[#1a1240] transition hover:brightness-110 sm:w-auto"
            >
              Start free
            </Link>
            <a
              href="#features"
              className="w-full rounded-full border border-[color:var(--glass-border)] bg-white/[0.08] px-7 py-3.5 text-[0.95rem] font-semibold text-white transition hover:bg-white/[0.14] sm:w-auto"
            >
              See features
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

      {/* FEATURES */}
      <section id="features" className="relative z-10 mx-auto max-w-[1100px] scroll-mt-20 px-6 py-16">
        <h2 className="font-display text-center text-[1.8rem] font-bold text-white sm:text-[2.4rem]">Everything time-critical, handled</h2>
        <p className="mx-auto mt-3 max-w-[560px] text-center text-[0.95rem] text-[color:var(--ink-dim)]">
          Structured yet flexible reminder management with built-in hierarchy — the sweet spot between generic calendars and heavy enterprise suites.
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

      {/* ROLES */}
      <section id="roles" className="relative z-10 mx-auto max-w-[1100px] scroll-mt-20 px-6 py-16">
        <h2 className="font-display text-center text-[1.8rem] font-bold text-white sm:text-[2.4rem]">One platform, three tiers of control</h2>
        <p className="mx-auto mt-3 max-w-[560px] text-center text-[0.95rem] text-[color:var(--ink-dim)]">
          From global broadcast events to personal alarm preferences — every stakeholder gets exactly the right level of control.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {roles.map(r => (
            <div key={r.badge} className="glass relative overflow-hidden p-6">
              <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: r.color }} />
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-[11px]" style={{ background: `${r.color}22`, color: r.color }}>
                  <r.icon size={18} />
                </span>
                <span className="text-[0.75rem] font-bold uppercase tracking-[0.08em]" style={{ color: r.color }}>{r.badge}</span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {r.points.map(p => (
                  <li key={p} className="flex items-start gap-2 text-[0.85rem] text-[color:var(--ink-dim)]">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: r.color }} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative z-10 mx-auto max-w-[1100px] scroll-mt-20 px-6 py-16">
        <h2 className="font-display text-center text-[1.8rem] font-bold text-white sm:text-[2.4rem]">Simple, ANZ-first pricing</h2>
        <p className="mx-auto mt-3 max-w-[560px] text-center text-[0.95rem] text-[color:var(--ink-dim)]">
          Start free, upgrade when your team needs compliance, AI, and unlimited scale. Prices in NZD.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map(t => (
            <div
              key={t.name}
              className="glass flex flex-col p-6"
              style={t.highlight ? { borderColor: 'rgba(124,111,255,0.6)', boxShadow: '0 8px 40px rgba(124,111,255,0.25)' } : undefined}
            >
              {t.highlight && (
                <span className="mb-3 self-start rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-2.5 py-1 text-[0.6rem] font-extrabold uppercase tracking-[0.08em] text-[#1a1240]">
                  Most popular
                </span>
              )}
              <div className="font-display text-[1.05rem] font-bold text-white">{t.name}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-[1.8rem] font-extrabold text-white">{t.price}</span>
                <span className="text-[0.72rem] text-[color:var(--ink-faint)]">{t.unit}</span>
              </div>
              <p className="mt-3 flex-1 text-[0.82rem] leading-relaxed text-[color:var(--ink-dim)]">{t.blurb}</p>
              <Link
                to="/login"
                className="mt-5 rounded-full border border-[color:var(--glass-border)] bg-white/[0.08] py-2.5 text-center text-[0.82rem] font-bold text-white transition hover:bg-white/[0.16]"
              >
                {t.name === 'Enterprise' ? 'Contact sales' : 'Get started'}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-[900px] px-6 py-16">
        <div className="glass flex flex-col items-center gap-5 p-10 text-center">
          <CalendarClock size={40} className="text-[color:var(--cyan)]" />
          <h2 className="font-display text-[1.8rem] font-bold text-white sm:text-[2.2rem]">Ready to never miss what matters?</h2>
          <p className="max-w-[520px] text-[0.95rem] text-[color:var(--ink-dim)]">
            Join teams across Australia and New Zealand keeping their people on time, on task, and in compliance.
          </p>
          <Link
            to="/login"
            className="rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-8 py-3.5 text-[0.95rem] font-bold text-[#1a1240] transition hover:brightness-110"
          >
            Create your free account
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
