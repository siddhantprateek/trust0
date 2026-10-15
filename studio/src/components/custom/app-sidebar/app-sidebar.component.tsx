import { Boxes, ChevronRight, FileSearch, FlaskConical, Globe, KeyRound, LayoutDashboard, PlusCircle, Settings, UserCog } from 'lucide-react'
import { Collapsible as CollapsiblePrimitive } from 'radix-ui'
import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Logo from '@/components/custom/logo/logo.component'
import NavUser from '@/components/custom/nav-user/nav-user.component'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  useSidebar,
} from '@/components/ui/sidebar'

const workspaceItems = [
  { title: 'Overview', to: '/', icon: LayoutDashboard },
  { title: 'New check', to: '/checks/new', icon: PlusCircle },
  { title: 'Reports', to: '/reports', icon: FileSearch },
  { title: 'Models', to: '/models', icon: Boxes },
  { title: 'Playground', to: '/playground', icon: FlaskConical },
]

const settingsItems = [
  { title: 'Allow list', to: '/settings/allow-list', icon: Globe },
  { title: 'API keys', to: '/settings/api-keys', icon: KeyRound },
  { title: 'Account', to: '/settings/account', icon: UserCog },
]

// A pill that slides between rows on hover, like Pasta UI's file-tree selection indicator.
// Measured via getBoundingClientRect rather than offsetTop: rows can be nested several levels
// deep (e.g. settings sub-items inside the trigger's own li), and offsetTop resolves against the
// nearest *positioned* ancestor, which isn't always this container — getBoundingClientRect is
// always in the same viewport coordinate space regardless of DOM nesting.
// Falls back to the active route's row when nothing is hovered, so the pill sits under it at rest
// and slides away to the cursor instead of leaving two rows highlighted at once.
function useRowIndicator(activeKey: string | null) {
  const containerRef = useRef<HTMLUListElement>(null)
  const rowsRef = useRef(new Map<string, HTMLElement>())
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [rect, setRect] = useState<{ top: number; height: number } | null>(null)
  const indicatorKey = hoveredKey ?? activeKey

  useLayoutEffect(() => {
    const container = containerRef.current
    const row = indicatorKey ? rowsRef.current.get(indicatorKey) : null
    if (!container || !row) {
      setRect(null)
      return
    }
    const containerRect = container.getBoundingClientRect()
    const rowRect = row.getBoundingClientRect()
    setRect({ top: rowRect.top - containerRect.top, height: rowRect.height })
  }, [indicatorKey])

  return {
    containerRef,
    registerRow: (key: string) => (el: HTMLElement | null) => {
      if (el) rowsRef.current.set(key, el)
      else rowsRef.current.delete(key)
    },
    onRowEnter: setHoveredKey,
    onContainerLeave: () => setHoveredKey(null),
    rect,
  }
}

function HoverIndicator({ rect }: { rect: { top: number; height: number } | null }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 z-0 rounded-md bg-sidebar-accent transition-[top,height,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
      style={{ top: rect?.top ?? 0, height: rect?.height ?? 0, opacity: rect ? 1 : 0 }}
    />
  )
}

export default function AppSidebar() {
  const { pathname } = useLocation()
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  // Exact match for the overview, prefix match elsewhere so /reports/:id keeps Reports active
  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to))
  const inSettings = pathname.startsWith('/settings')
  const workspaceActiveKey = workspaceItems.find((item) => isActive(item.to))?.to ?? null
  const settingsActiveKey = settingsItems.find((item) => isActive(item.to))?.to ?? (inSettings ? 'settings-trigger' : null)

  const {
    containerRef: workspaceContainerRef,
    registerRow: registerWorkspaceRow,
    onRowEnter: onWorkspaceRowEnter,
    onContainerLeave: onWorkspaceLeave,
    rect: workspaceRect,
  } = useRowIndicator(workspaceActiveKey)
  const {
    containerRef: settingsContainerRef,
    registerRow: registerSettingsRow,
    onRowEnter: onSettingsRowEnter,
    onContainerLeave: onSettingsLeave,
    rect: settingsRect,
  } = useRowIndicator(settingsActiveKey)

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
            <SidebarMenu ref={workspaceContainerRef} className="relative" onMouseLeave={onWorkspaceLeave}>
              <HoverIndicator rect={workspaceRect} />
              {workspaceItems.map((item) => (
                <SidebarMenuItem key={item.to} ref={registerWorkspaceRow(item.to)} onMouseEnter={() => onWorkspaceRowEnter(item.to)}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.to)}
                    tooltip={item.title}
                    className="relative z-10 bg-transparent! hover:bg-transparent! active:bg-transparent! data-active:bg-transparent!"
                  >
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
            <SidebarMenu ref={settingsContainerRef} className="relative" onMouseLeave={onSettingsLeave}>
              {!isCollapsed && <HoverIndicator rect={settingsRect} />}
              {isCollapsed ? (
                // Collapsed to icons: the sub-menu has nowhere to expand into, so use a dropdown instead
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton isActive={inSettings} tooltip="Settings">
                        <Settings />
                        <span>Settings</span>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start">
                      {settingsItems.map((item) => (
                        <DropdownMenuItem key={item.to} asChild>
                          <Link to={item.to}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ) : (
                // Uncontrolled: starts open by default, and the user's own toggle takes over from there
                <CollapsiblePrimitive.Root asChild defaultOpen>
                  <SidebarMenuItem
                    ref={registerSettingsRow('settings-trigger')}
                    onMouseEnter={() => onSettingsRowEnter('settings-trigger')}
                  >
                    <CollapsiblePrimitive.Trigger asChild>
                      <SidebarMenuButton
                        isActive={inSettings}
                        tooltip="Settings"
                        className="relative z-10 bg-transparent! hover:bg-transparent! active:bg-transparent! data-active:bg-transparent!"
                      >
                        <Settings />
                        <span>Settings</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/menu-item:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsiblePrimitive.Trigger>
                    <CollapsiblePrimitive.Content>
                      <SidebarMenuSub>
                        {settingsItems.map((item) => (
                          <SidebarMenuSubItem
                            key={item.to}
                            ref={registerSettingsRow(item.to)}
                            onMouseEnter={() => onSettingsRowEnter(item.to)}
                          >
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive(item.to)}
                              className="relative z-10 bg-transparent! hover:bg-transparent! active:bg-transparent! data-active:bg-transparent!"
                            >
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
              )}
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
