import { useClerk, useUser } from '@clerk/react'
import { ChevronsUpDown, LogOut, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'

function UserSummary({ name, email, imageUrl, initials }: { name: string; email: string; imageUrl?: string; initials: string }) {
  return (
    <>
      {/* Shrinks when the sidebar collapses; the dropdown copy is portaled outside, so it keeps full size */}
      <Avatar className="size-8 rounded-lg group-data-[collapsible=icon]:size-5 group-data-[collapsible=icon]:rounded-full">
        <AvatarImage src={imageUrl} alt={name} />
        <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
        <span className="truncate font-medium">{name}</span>
        <span className="truncate text-xs text-muted-foreground">{email}</span>
      </div>
    </>
  )
}

export default function NavUser() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const { isMobile } = useSidebar()

  if (!user) return null

  const email = user.primaryEmailAddress?.emailAddress ?? ''
  const name = user.fullName || user.username || email
  const initials = (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '') || email[0]?.toUpperCase() || '?'
  const summary = <UserSummary name={name} email={email} imageUrl={user.imageUrl} initials={initials} />

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
            >
              {summary}
              <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5">{summary}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings />
                  Manage account
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => signOut({ redirectUrl: '/sign-in' })}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
