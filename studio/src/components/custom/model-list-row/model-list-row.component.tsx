import { Boxes, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import type { ModelInfo, ModelStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const statusLabels: Record<ModelStatus, string> = {
  available: 'Available',
  offline: 'Offline',
  'coming-soon': 'Coming soon',
}

const statusVariants = {
  available: 'default',
  offline: 'destructive',
  'coming-soon': 'secondary',
} as const satisfies Record<ModelStatus, string>

export default function ModelListRow({ model }: { model: ModelInfo }) {
  return (
    <Link
      to={`/models/${model.id}`}
      className={cn(
        'flex items-center gap-3 px-3 py-3 text-sm transition-colors hover:bg-muted/50',
        model.status === 'coming-soon' && 'opacity-70',
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-foreground ring-1 ring-foreground/10">
        <Boxes className="size-4" strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono font-medium">{model.name}</p>
        <p className="truncate text-xs text-muted-foreground">{model.task}</p>
      </div>
      <Badge variant={statusVariants[model.status]}>{statusLabels[model.status]}</Badge>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}
