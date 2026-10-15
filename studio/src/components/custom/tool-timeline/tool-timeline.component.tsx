import { ChevronRight, Workflow } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import StepStatusIcon from '@/components/custom/step-status-icon/step-status-icon.component'
import { formatDuration, runElapsedMs, stepElapsedMs } from '@/lib/steps'
import type { ReportStep, StepStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const labelTone: Record<StepStatus, string> = {
  complete: 'text-foreground/80',
  running: 'text-foreground',
  failed: 'text-destructive',
  cancelled: 'text-muted-foreground',
  skipped: 'text-muted-foreground/60',
  pending: 'text-muted-foreground/55',
}

function TimelineConnector({ reached }: { reached: boolean }) {
  return (
    <span aria-hidden="true" className="absolute top-6 bottom-1 left-2 w-px -translate-x-1/2 overflow-hidden bg-foreground/8">
      <span
        className={cn(
          'absolute inset-0 origin-top bg-foreground/25 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
          reached ? 'scale-y-100' : 'scale-y-0',
        )}
      />
    </span>
  )
}

type ToolTimelineProps = {
  steps: ReportStep[]
  title?: string
  defaultOpen?: boolean
  className?: string
}

export default function ToolTimeline({ steps, title = 'How this was checked', defaultOpen = true, className }: ToolTimelineProps) {
  const [open, setOpen] = useState(defaultOpen)
  // Only rendered for finished checks: every started stage has ended, so the last end time stands in for "now"
  const finishedAt = Math.max(0, ...steps.flatMap((step) => (step.endedAt ? [Date.parse(step.endedAt)] : [])))
  const total = runElapsedMs(steps, finishedAt)
  const ran = steps.filter((step) => step.status === 'complete').length

  return (
    <section data-slot="tool-timeline" className={cn('rounded-xl bg-card text-sm ring-1 ring-foreground/10', className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2 rounded-xl p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <Workflow className="size-4 text-muted-foreground" />
        <h2 className="leading-5 font-medium text-muted-foreground">{title}</h2>
        <span className="ml-auto text-[13px] leading-5 text-muted-foreground/70 tabular-nums">
          {ran} of {steps.length} stages ran{total !== null && ` · ${formatDuration(total)}`}
        </span>
        <ChevronRight
          className={cn(
            'size-4 text-muted-foreground transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
            open && 'rotate-90',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <ol className="px-4 pb-4">
              {steps.map((step, index) => {
                const next = steps[index + 1]
                const stepMs = stepElapsedMs(step, finishedAt)
                return (
                  <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {next && <TimelineConnector reached={next.status !== 'pending'} />}
                    <StepStatusIcon status={step.status} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-3">
                        <span className={cn('min-w-0 flex-1 truncate leading-5', labelTone[step.status])}>{step.label}</span>
                        {stepMs !== null && step.status !== 'skipped' && (
                          <time className="shrink-0 font-mono text-[11px] text-muted-foreground/70 tabular-nums">{formatDuration(stepMs)}</time>
                        )}
                      </p>
                      {step.detail && <p className="mt-0.5 text-xs leading-4 text-muted-foreground/70">{step.detail}</p>}
                    </div>
                  </li>
                )
              })}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
