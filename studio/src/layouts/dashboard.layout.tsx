import { RedirectToSignIn, Show } from '@clerk/react'
import { Outlet, useLocation } from 'react-router-dom'
import AppSidebar from '@/components/custom/app-sidebar/app-sidebar.component'
import SiteHeader from '@/components/custom/site-header/site-header.component'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

// Pages that manage their own full-height, edge-to-edge layout (no page padding or max-width cap)
const FULL_BLEED_PREFIXES = ['/playground']

export default function DashboardLayout() {
  const { pathname } = useLocation()
  const fullBleed = FULL_BLEED_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  return (
    // Everything under the dashboard requires a session; signed-out visitors go to /sign-in
    <Show when="signed-in" fallback={<RedirectToSignIn />}>
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
    </Show>
  )
}
