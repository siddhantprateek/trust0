import { ChevronRight, FileSearch, Globe, LayoutDashboard, PlusCircle, Settings, UserCog } from 'lucide-react'
import { Collapsible as CollapsiblePrimitive } from 'radix-ui'
import { Link, useLocation } from 'react-router-dom'
import Logo from '@/components/custom/logo/logo.component'
import NavUser from '@/components/custom/nav-user/nav-user.component'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar'

const workspaceItems = [
  { title: 'Overview', to: '/', icon: LayoutDashboard },
  { title: 'New check', to: '/checks/new', icon: PlusCircle },
  { title: 'Reports', to: '/reports', icon: FileSearch },
]

const settingsItems = [
  { title: 'Allow list', to: '/settings/allow-list', icon: Globe },
  { title: 'Account', to: '/settings/account', icon: UserCog },
]

export default function AppSidebar() {
  const { pathname } = useLocation()

  // Exact match for the overview, prefix match elsewhere so /reports/:id keeps Reports active
  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to))
  const inSettings = pathname.startsWith('/settings')

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <Logo mark />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.title}>
                    <Link to={item.to}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Uncontrolled: starts open on a settings page, and the user's own toggle takes over from there */}
              <CollapsiblePrimitive.Root asChild defaultOpen={inSettings}>
                <SidebarMenuItem>
                  <CollapsiblePrimitive.Trigger asChild>
                    <SidebarMenuButton isActive={inSettings} tooltip="Settings">
                      <Settings />
                      <span>Settings</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/menu-item:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsiblePrimitive.Trigger>
                  <CollapsiblePrimitive.Content>
                    <SidebarMenuSub>
                      {settingsItems.map((item) => (
                        <SidebarMenuSubItem key={item.to}>
                          <SidebarMenuSubButton asChild isActive={isActive(item.to)}>
                            <Link to={item.to}>
                              <item.icon />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsiblePrimitive.Content>
                </SidebarMenuItem>
              </CollapsiblePrimitive.Root>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
