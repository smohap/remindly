import { useEffect } from 'react'
import { CheckoutReturn } from '../components/CheckoutReturn'
import { DesktopLayout } from '../components/DesktopLayout'
import { MobileLayout } from '../components/MobileShell'
import { GlobalSheets } from '../components/Sheets'
import { hydrateActivity, refreshActivity } from '../lib/activityStore'
import { currentUserId } from '../lib/invoicesDb'
import { useIsMobile } from '../lib/useIsMobile'
import { useNotifications } from '../lib/useNotifications'
import { hydratePremium } from '../lib/usePremium'
import { hydratePreferences } from '../lib/usePreferences'
import { useTheme } from '../lib/useTheme'
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
  const { derived } = useStore()
  useNotifications(derived.active)
  return null
}

function Shell() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileLayout /> : <DesktopLayout />
}

export default function Dashboard() {
  // Applies data-theme; the CSS only honours it under data-app.
  useTheme()
  // The dashboard uses the flat theme; marketing pages keep the aurora.
  useEffect(() => {
    document.documentElement.setAttribute('data-app', '')
    return () => document.documentElement.removeAttribute('data-app')
  }, [])

  // Pull the signed-in user's workspace down from Postgres once on entry.
  // In demo mode (no Supabase) this is a no-op and the local copy is used.
  useEffect(() => {
    let cancelled = false
    currentUserId().then(uid => {
      if (uid && !cancelled) {
        void hydrateWorkspace(uid)
        void hydratePremium(uid)
        void hydrateActivity(uid)
        void hydratePreferences(uid)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => void refreshActivity(), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <StoreProvider>
      <Shell />
      <GlobalSheets />
      <CheckoutReturn />
      <LiveRegion />
      <NotificationRunner />
    </StoreProvider>
  )
}
