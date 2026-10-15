import { useAuth } from '@clerk/react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import AppSidebar from '@/components/custom/app-sidebar/app-sidebar.component'
import SiteHeader from '@/components/custom/site-header/site-header.component'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { signInPath } from '@/lib/auth-redirect'

// Pages that manage their own full-height, edge-to-edge layout (no page padding or max-width cap)
const FULL_BLEED_PREFIXES = ['/playground']

export default function DashboardLayout() {
  const { pathname, search, hash } = useLocation()
  const { isLoaded, isSignedIn } = useAuth()
  const fullBleed = FULL_BLEED_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (!isLoaded) return null
  // Everything under the dashboard requires a session. The return path comes from the router, not
  // window.location: Clerk's <RedirectToSignIn> read it after navigation had started and sent people back to /sign-in
  if (!isSignedIn) return <Navigate to={signInPath(`${pathname}${search}${hash}`)} replace />

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        {fullBleed ? (
          <div className="min-h-0 flex-1">
            <Outlet />
          </div>
        ) : (
          <div className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">
            <Outlet />
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
