import { AuroraBackground } from '../components/AuroraBackground'
import { DesktopLayout } from '../components/DesktopLayout'
import { MobileLayout } from '../components/MobileShell'
import { GlobalSheets } from '../components/Sheets'
import { useIsMobile } from '../lib/useIsMobile'
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
  return (
    <StoreProvider>
      <AuroraBackground />
      <Shell />
      <GlobalSheets />
      <LiveRegion />
    </StoreProvider>
  )
}
