import { useNotifications } from '../lib/useNotifications'
import { useStore } from '../store'

/** Ask for permission to send desktop/mobile nudges. */
export function NotificationsCard() {
  const { state } = useStore()
  const { supported, permission, request } = useNotifications(state.reminders)

  const body =
    !supported ? "This browser can't show notifications."
    : permission === 'granted' ? 'On — you\'ll be nudged every 15 minutes until you acknowledge. Timed reminders start an hour before; all-day ones start that morning.'
    : permission === 'denied' ? 'Blocked. Re-enable notifications for this site in your browser settings.'
    : 'Get nudged when a reminder is due, even when Neuroli is in another tab.'

  return (
    <div className="card flex flex-col gap-2 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-[0.82rem] font-bold">🔔 Notifications</h3>
        {permission === 'granted' ? (
          <span className="badge bg-[rgba(52,211,153,0.16)] text-[color:var(--ok)]">On</span>
        ) : (
          <button onClick={() => void request()} disabled={!supported || permission === 'denied'} className="btn-primary px-3.5 py-1.5 text-[0.74rem]">
            Turn on
          </button>
        )}
      </div>
      <p className="text-[0.72rem] leading-relaxed text-[color:var(--ink-dim)]">{body}</p>
      <p className="text-[0.68rem] text-[color:var(--ink-faint)]">On iPhone, add Neuroli to your Home Screen first — Safari only allows notifications for installed apps.</p>
    </div>
  )
}

