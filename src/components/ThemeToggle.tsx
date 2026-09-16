import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/useTheme'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={
        'relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-[color:var(--border)] text-[color:var(--ink-dim)] transition hover:bg-[color:var(--hover)] ' +
        className
      }
    >
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}
