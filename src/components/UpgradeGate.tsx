import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { FEATURE_LABEL, planForFeature, planLabel, type Feature } from '../lib/plans'
import { useStore } from '../store'

/**
 * The one locked-state surface. Shows what the feature is, which plan
 * includes it, and a single Upgrade button that opens the plan chooser with
 * that plan pre-selected. Optional `preview` renders dimmed behind the copy.
 */
export function UpgradeGate({
  feature,
  title,
  description,
  preview,
}: {
  feature: Feature
  title?: string
  description: string
  preview?: ReactNode
}) {
  const { actions } = useStore()
  const plan = planForFeature(feature)
  return (
    <div className="card relative overflow-hidden">
      {preview && (
        <div className="pointer-events-none select-none opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden>
          {preview}
        </div>
      )}
      <div className={preview ? 'absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center' : 'flex flex-col items-center gap-3 px-6 py-12 text-center'}>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
          <Lock size={18} />
        </span>
        <div>
          <h3 className="font-display text-[1.05rem] font-bold">{title ?? FEATURE_LABEL[feature]}</h3>
          <p className="mx-auto mt-1 max-w-md text-[0.84rem] leading-relaxed text-[color:var(--ink-dim)]">{description}</p>
          <p className="mt-2 text-[0.74rem] text-[color:var(--ink-faint)]">Included in {planLabel(plan)} and above</p>
        </div>
        <button onClick={() => actions.openUpgrade(feature)} className="btn-primary">
          Upgrade to {planLabel(plan)}
        </button>
      </div>
    </div>
  )
}
