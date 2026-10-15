import { CircleAlert, CircleStop, LoaderCircle, Plus, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import ToolTimeline from '@/components/custom/tool-timeline/tool-timeline.component'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { Report } from '@/lib/types'
import { cn } from '@/lib/utils'

/** A check that ended without a verdict, because someone cancelled it or a stage failed. */
export default function StoppedCheck({ report }: { report: Report }) {
  const navigate = useNavigate()
  const [retrying, setRetrying] = useState(false)
  const cancelled = report.status === 'cancelled'
  const stoppedAt = report.steps.find((step) => step.status === 'cancelled' || step.status === 'failed')
  const finished = report.steps.filter((step) => step.status === 'complete').length
  // Pasted text and uploads aren't kept in full, so only links can be checked again from here
  const canRetry = Boolean(report.url) && report.source !== 'text' && report.source !== 'upload'

  const where = stoppedAt ? ` while ${stoppedAt.label.charAt(0).toLowerCase()}${stoppedAt.label.slice(1)}` : ''
  const description = cancelled
    ? `Stopped${where}. ${finished} of ${report.steps.length} stages had finished; nothing after that ran, so there's no verdict.`
    : (report.error ?? `Something went wrong${where}.`)

  async function retry() {
    setRetrying(true)
    try {
      const next = await api.createReport({ kind: 'link', url: report.url })
      navigate(`/reports/${next.id}`)
    } catch (err) {
      toast.error('Could not start the check again', { description: err instanceof Error ? err.message : String(err) })
      setRetrying(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:flex-row sm:items-center">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full',
            cancelled ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive',
          )}
        >
          {cancelled ? <CircleStop className="size-5" /> : <CircleAlert className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] leading-6 font-medium">{cancelled ? 'Check cancelled' : 'Check failed'}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" asChild>
            <Link to="/checks/new">
              <Plus data-icon="inline-start" />
              New check
            </Link>
          </Button>
          {canRetry && (
            <Button onClick={retry} disabled={retrying}>
              {retrying ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <RotateCw data-icon="inline-start" />}
              Check again
            </Button>
          )}
        </div>
      </section>

      {report.steps.length > 0 && <ToolTimeline steps={report.steps} title="Where it stopped" defaultOpen={!cancelled} />}
    </div>
  )
}
