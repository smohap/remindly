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

const UPDATED = 'Last updated: 10 July 2026'

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
          Remindly is ANZ-first. Enterprise customers can elect Australia/New Zealand data residency. Other data is processed
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
