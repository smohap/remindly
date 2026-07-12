import { Link } from 'react-router-dom'

/** Compact footer shown at the bottom of the signed-in app. */
export function AppFooter() {
  return (
    <footer className="mt-2 flex flex-col items-center justify-between gap-2 border-t border-white/10 px-2 pb-2 pt-4 text-[0.72rem] text-[color:var(--ink-faint)] sm:flex-row">
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))]" />
        © {new Date().getFullYear()} Remindly · v1.0
      </span>
      <nav className="flex items-center gap-4" aria-label="Footer">
        <Link to="/terms" className="transition hover:text-white">Terms</Link>
        <Link to="/privacy" className="transition hover:text-white">Privacy</Link>
        <Link to="/contact" className="transition hover:text-white">Contact</Link>
      </nav>
    </footer>
  )
}
