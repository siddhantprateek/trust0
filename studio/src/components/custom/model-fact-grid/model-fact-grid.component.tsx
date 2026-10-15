import { CircleCheck, CircleX, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ModelFact = {
  title: string
  subtitle: string
  icon: LucideIcon
  supported: boolean
}

type ModelFactGridProps = {
  title: string
  description?: string
  facts: ModelFact[]
}

/** A titled section of two-column facts (Modalities, Endpoint, Capabilities…), each marked supported or not. */
export default function ModelFactGrid({ title, description, facts }: ModelFactGridProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.title} className="flex items-start gap-3">
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-md border',
                fact.supported ? 'text-foreground' : 'text-muted-foreground/50',
              )}
            >
              <fact.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className={cn('text-sm font-medium', !fact.supported && 'text-muted-foreground')}>{fact.title}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {fact.supported ? <CircleCheck className="size-3 shrink-0" /> : <CircleX className="size-3 shrink-0" />}
                <span className="truncate">{fact.subtitle}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
