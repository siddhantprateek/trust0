import { UserButton } from '@clerk/react'
import { FileSearch, LayoutDashboard, PlusCircle, Settings } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import Logo from '@/components/custom/logo/logo.component'
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
  SidebarRail,
} from '@/components/ui/sidebar'

const groups = [
  {
    label: 'Workspace',
    items: [
      { title: 'Overview', to: '/', icon: LayoutDashboard },
      { title: 'New check', to: '/checks/new', icon: PlusCircle },
      { title: 'Reports', to: '/reports', icon: FileSearch },
    ],
  },
  {
    label: 'Account',
    items: [{ title: 'Settings', to: '/settings', icon: Settings }],
  },
]

export default function AppSidebar() {
  const { pathname } = useLocation()

  // Exact match for the overview, prefix match elsewhere so /reports/:id keeps Reports active
  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to))

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <Logo />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
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
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center px-1 py-1.5 group-data-[collapsible=icon]:justify-center">
          <UserButton showName />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
