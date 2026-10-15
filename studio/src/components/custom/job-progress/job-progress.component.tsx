import { LoaderCircle, X } from 'lucide-react'
import { useState } from 'react'
import StepStatusIcon from '@/components/custom/step-status-icon/step-status-icon.component'
import { Button } from '@/components/ui/button'
import { useNow } from '@/hooks/use-now'
import { formatDuration, runElapsedMs, runningSteps, stepElapsedMs, stepFill, stepsProgress, stepWeight } from '@/lib/steps'
import type { ReportStep, StepStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const labelTone: Record<StepStatus, string> = {
  complete: 'text-muted-foreground',
  skipped: 'text-muted-foreground/60',
  failed: 'text-destructive',
  cancelled: 'text-muted-foreground',
  pending: 'text-muted-foreground/60',
  running: 'text-foreground',
}

const segmentTone: Record<StepStatus, string> = {
  complete: 'bg-blue-500 dark:bg-blue-400',
  running: 'bg-blue-500 dark:bg-blue-400',
  pending: 'bg-blue-500 dark:bg-blue-400',
  skipped: 'bg-muted-foreground/30',
  failed: 'bg-destructive',
  cancelled: 'bg-muted-foreground/50',
}

type JobProgressProps = {
  title: string
  steps: ReportStep[]
  onCancel?: () => Promise<unknown>
  className?: string
}

export default function JobProgress({ title, steps, onCancel, className }: JobProgressProps) {
  const [confirming, setConfirming] = useState(false)
  const [stopping, setStopping] = useState(false)
  const running = runningSteps(steps)
  const now = useNow(1000, running.length > 0)
  const progress = stepsProgress(steps)
  const elapsed = runElapsedMs(steps, now)
  const status = running.length > 0 ? running.map((step) => step.label).join(' · ') : 'Starting…'

  return (
    <section data-slot="job-progress" className={cn('rounded-xl bg-card p-5 text-sm ring-1 ring-foreground/10', className)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] leading-6 font-medium">{title}</h2>
          <p className="mt-0.5 truncate text-[13px] leading-5 text-muted-foreground tabular-nums">
            {progress}% complete · {status}
          </p>
        </div>
        {elapsed !== null && !confirming && (
          <span className="shrink-0 font-mono text-xs leading-6 text-muted-foreground tabular-nums">{formatDuration(elapsed)}</span>
        )}
        {onCancel &&
          (confirming ? (
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground" disabled={stopping} onClick={() => setConfirming(false)}>
                Keep running
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
                disabled={stopping}
                onClick={async () => {
                  setStopping(true)
                  try {
                    // On success this card is replaced by the cancelled state on the next poll, so stay in "Stopping"
                    await onCancel()
                  } catch {
                    setStopping(false)
                    setConfirming(false)
                  }
                }}
              >
                {stopping && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
                {stopping ? 'Stopping' : 'Stop check'}
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon-sm" className="-mt-0.5 shrink-0" aria-label="Cancel check" onClick={() => setConfirming(true)}>
              <X />
            </Button>
          ))}
      </div>

      <progress aria-label={`${title} progress`} className="sr-only" max={100} value={progress} />
      <div aria-hidden="true" className="mt-4 flex gap-1">
        {steps.map((step) => (
          <span key={step.id} className="h-1.5 overflow-hidden rounded-full bg-foreground/8" style={{ flexGrow: stepWeight(step), flexBasis: 0 }}>
            <span
              className={cn(
                'block h-full origin-left rounded-full transition-[scale] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]',
                segmentTone[step.status],
                step.status === 'running' && 'animate-pulse',
              )}
              style={{ scale: `${stepFill(step)} 1` }}
            />
          </span>
        ))}
      </div>

      <ol className="mt-5 space-y-3">
        {steps.map((step) => {
          const stepMs = stepElapsedMs(step, now)
          return (
            <li key={step.id} className="flex items-start gap-3">
              <span className="flex h-5 items-center">
                <StepStatusIcon status={step.status} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-3">
                  <span className={cn('min-w-0 flex-1 leading-5', labelTone[step.status])}>{step.label}</span>
                  {stepMs !== null && step.status !== 'skipped' && (
                    <span
                      className={cn(
                        'shrink-0 font-mono text-[11px] leading-5 tabular-nums',
                        step.status === 'running' ? 'text-foreground/70' : 'text-muted-foreground/70',
                      )}
                    >
                      {formatDuration(stepMs)}
                      {step.status === 'running' && '…'}
                    </span>
                  )}
                </p>
                {step.detail && step.status !== 'pending' && (
                  <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground/70 tabular-nums">{step.detail}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
