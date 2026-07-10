import { Link } from 'react-router-dom'
import { Brand } from './Brand'

const productLinks = [
  { label: 'Features', to: '/#features' },
  { label: 'Roles', to: '/#roles' },
  { label: 'Pricing', to: '/#pricing' },
  { label: 'Sign in', to: '/login' },
]

const companyLinks = [
  { label: 'Contact Us', to: '/contact' },
  { label: 'Terms & Conditions', to: '/terms' },
  { label: 'Privacy Policy', to: '/privacy' },
]

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-xl">
      <div className="mx-auto grid max-w-[1100px] gap-10 px-6 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-2">
          <Brand />
          <p className="mt-3 max-w-sm text-[0.85rem] leading-relaxed text-[color:var(--ink-dim)]">
            The intelligent reminder platform for teams. Bridge personal deadlines, group coordination, and
            enterprise-grade notification management — all in one place.
          </p>
          <p className="mt-4 text-[0.75rem] text-[color:var(--ink-faint)]">ANZ-first · Built for SMEs, clubs &amp; compliance teams</p>
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
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-3 px-6 py-5 text-[0.75rem] text-[color:var(--ink-faint)] sm:flex-row">
          <span>© {new Date().getFullYear()} Remindly. All rights reserved.</span>
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
