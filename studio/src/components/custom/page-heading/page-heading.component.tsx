import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PageHeadingProps = {
  title: string
  description?: string
  actions?: ReactNode
  titleClassName?: string
}

export default function PageHeading({ title, description, actions, titleClassName }: PageHeadingProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className={cn('text-2xl font-semibold tracking-tight', titleClassName)}>{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}
