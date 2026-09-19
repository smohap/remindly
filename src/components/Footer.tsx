import { Link } from 'react-router-dom'
import { Brand } from './Brand'

const productLinks = [
  { label: 'Features', to: '/features' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Roadmap', to: '/roadmap' },
  { label: 'Sign in', to: '/login' },
]

const companyLinks = [
  { label: 'About Us', to: '/about' },
  { label: 'Contact Us', to: '/contact' },
  { label: 'Security', to: '/security' },
  { label: 'Help & FAQ', to: '/faq' },
]

const legalLinks = [
  { label: 'Terms & Conditions', to: '/terms' },
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Cookie Policy', to: '/cookies' },
  { label: 'Acceptable Use', to: '/acceptable-use' },
]

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-xl">
      <div className="mx-auto grid max-w-[1100px] gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Brand />
          <p className="mt-3 max-w-sm text-[0.85rem] leading-relaxed text-[color:var(--ink-dim)]">
            The reminder platform for individuals and teams. Keep track of personal deadlines, family life, group
            coordination and business compliance — all in one place.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">Product</h4>
          <ul className="flex flex-col gap-2">
            {productLinks.map(l => (
              <li key={l.label}>
                <Link to={l.to} className="text-[0.85rem] text-[color:var(--ink-dim)] transition hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">Company</h4>
          <ul className="flex flex-col gap-2">
            {companyLinks.map(l => (
              <li key={l.label}>
                <Link to={l.to} className="text-[0.85rem] text-[color:var(--ink-dim)] transition hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">Legal</h4>
          <ul className="flex flex-col gap-2">
            {legalLinks.map(l => (
              <li key={l.label}>
                <Link to={l.to} className="text-[0.85rem] text-[color:var(--ink-dim)] transition hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-3 px-6 py-5 text-[0.75rem] text-[color:var(--ink-faint)] sm:flex-row">
          <span>© {new Date().getFullYear()} Neuroli — a product of AIDO Technologies Ltd. All rights reserved.</span>
          <span className="flex gap-4">
            <Link to="/terms" className="hover:text-white">Terms</Link>
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
          </span>
        </div>
      </div>
    </footer>
  )
}
