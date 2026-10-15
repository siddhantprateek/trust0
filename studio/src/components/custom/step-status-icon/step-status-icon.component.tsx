import { CircleAlert, CircleCheck, CircleMinus, CircleStop, LoaderCircle } from 'lucide-react'
import type { StepStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const statusLabels: Record<StepStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  complete: 'Complete',
  skipped: 'Skipped',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

// Pops in when a stage changes state, so progress reads as movement rather than a swap
const enter =
  'transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] starting:scale-90 starting:opacity-0 motion-reduce:starting:scale-100'

export default function StepStatusIcon({ status, className }: { status: StepStatus; className?: string }) {
  return (
    <span className={cn('flex size-4 shrink-0 items-center justify-center', className)}>
      {status === 'complete' && <CircleCheck aria-hidden="true" className={cn('size-4 text-emerald-600 dark:text-emerald-500', enter)} />}
      {status === 'running' && (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-blue-500 motion-reduce:animate-none dark:text-blue-400" />
      )}
      {status === 'failed' && <CircleAlert aria-hidden="true" className={cn('size-4 text-destructive', enter)} />}
      {status === 'cancelled' && <CircleStop aria-hidden="true" className={cn('size-4 text-muted-foreground', enter)} />}
      {status === 'skipped' && <CircleMinus aria-hidden="true" className={cn('size-4 text-muted-foreground/60', enter)} />}
      {status === 'pending' && <span aria-hidden="true" className="size-3.5 rounded-full border-[1.5px] border-muted-foreground/45" />}
      <span className="sr-only">{statusLabels[status]}</span>
    </span>
  )
}
