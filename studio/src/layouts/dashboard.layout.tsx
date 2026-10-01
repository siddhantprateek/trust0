import { RedirectToSignIn, Show } from '@clerk/react'
import { Outlet } from 'react-router-dom'
import AppSidebar from '@/components/custom/app-sidebar/app-sidebar.component'
import SiteHeader from '@/components/custom/site-header/site-header.component'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

export default function DashboardLayout() {
  return (
    // Everything under the dashboard requires a session; signed-out visitors go to /sign-in
    <Show when="signed-in" fallback={<RedirectToSignIn />}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <div className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </Show>
  )
}
