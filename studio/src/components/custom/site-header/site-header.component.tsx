import { Search } from 'lucide-react'
import { Fragment, useEffect, useState } from 'react'
import { Link, useMatches, type Params } from 'react-router-dom'
import BackgroundRuns from '@/components/custom/background-runs/background-runs.component'
import CommandPalette from '@/components/custom/command-palette/command-palette.component'
import ThemeToggle from '@/components/custom/theme-toggle/theme-toggle.component'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

// Routes opt into the breadcrumb trail with `handle: { crumb }`
export type CrumbHandle = {
  crumb: string | ((params: Params) => string)
}

function hasCrumb(handle: unknown): handle is CrumbHandle {
  return typeof handle === 'object' && handle !== null && 'crumb' in handle
}

export default function SiteHeader() {
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const crumbs = useMatches()
    .filter((match) => hasCrumb(match.handle))
    .map((match) => {
      const { crumb } = match.handle as CrumbHandle
      return { path: match.pathname, label: typeof crumb === 'function' ? crumb(match.params) : crumb }
    })

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <Fragment key={crumb.path}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {i === crumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.path}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="ml-auto flex h-8 w-56 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground dark:bg-input/30"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">Search reports, APIs, models…</span>
        <kbd className="flex shrink-0 items-center gap-0.5 rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
          <span>⌘</span>K
        </kbd>
      </button>
      <BackgroundRuns />
      <ThemeToggle />
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  )
}
