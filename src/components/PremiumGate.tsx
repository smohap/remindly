import type { ReactNode } from 'react'
import { Lock, Sparkles } from 'lucide-react'

/**
 * TASK-000 — locked-state wrapper. Renders a blurred, non-interactive preview
 * of a premium feature with an upgrade CTA (not a hard error), for surfaces
 * whose backend isn't wired yet.
 */
export function PremiumGate({
  title,
  description,
  cta = 'Upgrade to Premium',
  preview,
}: {
  title: string
  description: string
  cta?: string
  preview: ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px]">
      <div className="pointer-events-none select-none blur-[3px] saturate-[0.85] [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden>
        {preview}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/25 px-6 text-center backdrop-blur-[2px]">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] text-[#1a1240]">
          <Lock size={18} />
        </span>
        <div>
          <h3 className="font-display text-[1.05rem] font-bold text-white">{title}</h3>
          <p className="mx-auto mt-1 max-w-sm text-[0.82rem] text-[color:var(--ink-dim)]">{description}</p>
        </div>
        <button className="flex cursor-pointer items-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] px-5 py-2.5 text-[0.82rem] font-bold text-[#1a1240] transition hover:brightness-110">
          <Sparkles size={15} /> {cta}
        </button>
      </div>
    </div>
  )
}
