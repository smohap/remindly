import { useEffect } from 'react'
import { AuroraBackground } from '../components/AuroraBackground'
import { DesktopLayout } from '../components/DesktopLayout'
import { MobileLayout } from '../components/MobileShell'
import { GlobalSheets } from '../components/Sheets'
import { currentUserId } from '../lib/invoicesDb'
import { useIsMobile } from '../lib/useIsMobile'
import { useNotifications } from '../lib/useNotifications'
import { hydratePremium } from '../lib/usePremium'
import { hydrateWorkspace } from '../lib/useWorkspace'
import { StoreProvider, useStore } from '../store'

function LiveRegion() {
  const { state } = useStore()
  return (
    <div role="status" aria-live="polite" className="sr-only">
      {state.announcement}
    </div>
  )
}

/** Runs the due-reminder notification loop for as long as the app is open. */
function NotificationRunner() {
  const { state } = useStore()
  useNotifications(state.reminders, { quietHours: state.toggles.quietHours })
  return null
}

function Shell() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileLayout /> : <DesktopLayout />
}

export default function Dashboard() {
  // Pull the signed-in user's workspace down from Postgres once on entry.
  // In demo mode (no Supabase) this is a no-op and the local copy is used.
  useEffect(() => {
    let cancelled = false
    currentUserId().then(uid => {
      if (uid && !cancelled) {
        void hydrateWorkspace(uid)
        void hydratePremium(uid)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <StoreProvider>
      <AuroraBackground />
      <Shell />
      <GlobalSheets />
      <LiveRegion />
      <NotificationRunner />
    </StoreProvider>
  )
}
