import { useEffect } from 'react'
import { AuroraBackground } from '../components/AuroraBackground'
import { DesktopLayout } from '../components/DesktopLayout'
import { MobileLayout } from '../components/MobileShell'
import { GlobalSheets } from '../components/Sheets'
import { currentUserId } from '../lib/invoicesDb'
import { useIsMobile } from '../lib/useIsMobile'
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
      if (uid && !cancelled) void hydrateWorkspace(uid)
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
    </StoreProvider>
  )
}
