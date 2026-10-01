import { Fragment } from 'react'
import { Link, useMatches, type Params } from 'react-router-dom'
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
    </header>
  )
}
