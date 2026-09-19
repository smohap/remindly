import { Link } from 'react-router-dom'

/** Compact footer shown at the bottom of the signed-in app. */
export function AppFooter() {
  return (
    <footer className="mt-2 flex flex-col items-center justify-between gap-2 border-t border-[color:var(--border)] px-2 pb-2 pt-4 text-[0.72rem] text-[color:var(--ink-faint)] sm:flex-row">
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]" />
        © {new Date().getFullYear()} Neuroli by AIDO Technologies Ltd
      </span>
      <nav className="flex items-center gap-4" aria-label="Footer">
        <Link to="/terms" className="transition hover:text-[color:var(--ink)]">Terms</Link>
        <Link to="/privacy" className="transition hover:text-[color:var(--ink)]">Privacy</Link>
        <Link to="/contact" className="transition hover:text-[color:var(--ink)]">Contact</Link>
      </nav>
    </footer>
  )
}
