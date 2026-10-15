import { Layers, LoaderCircle, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import StepStatusIcon from '@/components/custom/step-status-icon/step-status-icon.component'
import { Button } from '@/components/ui/button'
import { useNow } from '@/hooks/use-now'
import { useRuns } from '@/hooks/use-runs'
import { api } from '@/lib/api'
import { verdictLabels } from '@/lib/format'
import { formatAgo, runningSteps, stepsProgress } from '@/lib/steps'
import type { RunSummary, StepStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const runStatus: Record<RunSummary['status'], StepStatus> = {
  analyzing: 'running',
  complete: 'complete',
  failed: 'failed',
  cancelled: 'cancelled',
}

function runDetail(run: RunSummary) {
  if (run.status === 'failed' || run.status === 'cancelled') {
    const stopped = run.steps.find((step) => step.status === run.status)
    const verb = run.status === 'failed' ? 'Failed' : 'Cancelled'
    return stopped ? `${verb} while ${stopped.label.toLowerCase()}` : `${verb} before it started`
  }
  if (run.status === 'complete') {
    return run.steps.find((step) => step.id === 'score')?.detail ?? verdictLabels[run.verdict]
  }
  const running = runningSteps(run.steps)
  return running.length > 0 ? running.map((step) => step.label).join(' · ') : 'Queued'
}

export default function BackgroundRuns() {
  const runs = useRuns()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [openedAt, setOpenedAt] = useState(() => Date.now())
  const running = runs.filter((run) => run.status === 'analyzing').length
  // The ticking clock idles while closed, so take a fresh reading whenever the popover opens
  const now = Math.max(useNow(30_000, open), openedAt)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [stoppingId, setStoppingId] = useState<string | null>(null)

  // An unanswered "Stop" confirmation quietly backs out, so a stray click can't be confirmed later by accident
  useEffect(() => {
    if (!confirmingId) return
    const timer = setTimeout(() => setConfirmingId(null), 3000)
    return () => clearTimeout(timer)
  }, [confirmingId])

  async function stop(run: RunSummary) {
    setStoppingId(run.id)
    try {
      await api.cancelReport(run.id)
    } catch (err) {
      toast.error('Could not stop the check', { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setStoppingId(null)
      setConfirmingId(null)
    }
  }

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (next) setOpenedAt(Date.now())
        setOpen(next)
      }}
    >
      <PopoverPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={running ? `${running} checks running` : 'Background runs'}>
          <Layers className="size-4" />
          {running > 0 && (
            <span className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-blue-500 text-[9px] leading-none font-semibold text-white tabular-nums dark:bg-blue-400 dark:text-background">
              {running}
            </span>
          )}
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 overflow-hidden rounded-xl bg-popover text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-100 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <header className="flex items-center gap-2 px-4 py-3">
            <Layers className="size-4 text-muted-foreground" />
            <h3 className="leading-5 font-medium text-muted-foreground">Background runs</h3>
            <span className="ml-auto rounded-full bg-foreground/6 px-2 py-0.5 text-xs leading-5 text-muted-foreground tabular-nums">
              {running ? `${running} running` : 'All done'}
            </span>
          </header>
          <ul className="max-h-96 space-y-1 overflow-y-auto border-t border-foreground/8 p-2">
            {runs.length === 0 && <li className="px-2.5 py-6 text-center text-muted-foreground">No checks in the last 15 minutes.</li>}
            <AnimatePresence initial={false}>
              {runs.map((run) => (
                <motion.li
                  key={run.id}
                  layout="position"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  className="group relative"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      navigate(`/reports/${run.id}`)
                    }}
                    className="w-full rounded-[10px] p-2.5 text-left transition-colors outline-none hover:bg-foreground/4 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex items-start gap-3">
                      <span className="flex h-6 items-center">
                        <StepStatusIcon status={runStatus[run.status]} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-3">
                          <span
                            className={cn(
                              'min-w-0 flex-1 truncate leading-6 font-medium',
                              run.status === 'analyzing' ? 'text-foreground' : 'text-muted-foreground',
                            )}
                          >
                            {run.title}
                          </span>
                          <time
                            className={cn(
                              'shrink-0 text-xs text-muted-foreground/70 tabular-nums',
                              // Makes room for the cancel control, which sits where the time is
                              run.status === 'analyzing' &&
                                'transition-opacity duration-150 group-focus-within:opacity-0 group-hover:opacity-0 pointer-coarse:opacity-0',
                              confirmingId === run.id && 'opacity-0',
                            )}
                          >
                            {formatAgo(run.createdAt, now)}
                          </time>
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] leading-5 text-muted-foreground/70">{runDetail(run)}</span>
                      </span>
                    </span>
                    {run.status === 'analyzing' && (
                      <span className="mt-2.5 ml-7 block h-1 overflow-hidden rounded-full bg-foreground/8">
                        <span
                          className="block h-full origin-left rounded-full bg-blue-500 transition-[scale] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] dark:bg-blue-400"
                          style={{ scale: `${stepsProgress(run.steps) / 100} 1` }}
                        />
                      </span>
                    )}
                  </button>
                  {run.status === 'analyzing' && (
                    <span className="absolute top-2.5 right-2.5 flex h-6 items-center">
                      {confirmingId === run.id ? (
                        <Button
                          variant="ghost"
                          size="xs"
                          aria-label={`Stop ${run.title}`}
                          disabled={stoppingId === run.id}
                          onClick={() => stop(run)}
                          className="rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
                        >
                          {stoppingId === run.id && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
                          Stop
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Cancel ${run.title}`}
                          onClick={() => setConfirmingId(run.id)}
                          className="opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
                        >
                          <X />
                        </Button>
                      )}
                    </span>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
