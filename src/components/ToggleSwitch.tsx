import { motion, useReducedMotion } from 'motion/react'

export function ToggleSwitch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  const reduce = useReducedMotion()
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="relative h-[22px] w-[38px] shrink-0 cursor-pointer rounded-full p-[3px] outline-none transition-colors after:absolute after:-inset-[11px] after:content-[''] focus-visible:ring-2 focus-visible:ring-[color:var(--cyan)]"
      style={{ background: on ? 'linear-gradient(135deg, var(--cyan), var(--violet))' : 'rgba(255,255,255,0.15)' }}
    >
      <motion.span
        className="block h-4 w-4 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.3)]"
        animate={{ x: on ? 16 : 0 }}
        transition={reduce ? { duration: 0.1 } : { type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  )
}
