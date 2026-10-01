import type { ReactNode } from 'react'

type PageHeadingProps = {
  title: string
  description?: string
  actions?: ReactNode
}

export default function PageHeading({ title, description, actions }: PageHeadingProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}
