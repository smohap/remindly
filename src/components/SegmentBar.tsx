/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { cn } from '../lib/cn'
import { useStore } from '../store'

export interface SegmentDef<K extends string> {
  key: K
  label: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  /** Shown with a lock glyph; selecting it still works (the view renders a gate). */
  locked?: boolean
  badge?: number
}

/** A flat, calm segmented control used at the top of every multi-part tab. */
export function SegmentBar<K extends string>({ segments, value, onChange, label }: { segments: SegmentDef<K>[]; value: K; onChange: (k: K) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="scrollbar-hidden -mx-1 flex gap-1 overflow-x-auto px-1">
      {segments.map(s => {
        const active = s.key === value
        return (
          <button
            key={s.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(s.key)}
            className={cn(
              'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[0.8rem] font-semibold transition-colors',
              active ? 'bg-[color:var(--surface-2)] text-[color:var(--ink)]' : 'text-[color:var(--ink-faint)] hover:text-[color:var(--ink-dim)]',
            )}
          >
            {s.icon && <s.icon size={14} />}
            {s.label}
            {s.locked && <Lock size={11} className="opacity-70" />}
            {s.badge ? <span className="badge bg-[color:var(--accent-soft)] text-[color:var(--accent)]">{s.badge}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Local segment state that also honours a segment requested through
 * `actions.openTab(tab, segment)` — e.g. Settings → "Profile" or a nav
 * lock opening straight onto the gated part.
 */
export function useSegment<K extends string>(valid: readonly K[], fallback: K): [K, (k: K) => void] {
  const { state, actions } = useStore()
  const requested = valid.includes(state.segment as K) ? (state.segment as K) : null
  const [segment, setSegment] = useState<K>(requested ?? fallback)
  useEffect(() => {
    if (requested) {
      setSegment(requested)
      actions.clearSegment()
    }
  }, [requested, actions])
  return [segment, setSegment]
}
