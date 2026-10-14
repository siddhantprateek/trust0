import { Badge } from '@/components/ui/badge'
import { verdictLabels } from '@/lib/format'
import type { ReportStatus, Verdict } from '@/lib/types'
import { cn } from '@/lib/utils'

const verdictStyles: Record<Verdict, string> = {
  'likely-ai': 'bg-destructive/10 text-destructive',
  edited: 'bg-chart-3/15 text-chart-3',
  authentic: 'bg-chart-1/15 text-chart-1',
  accurate: 'bg-chart-1/15 text-chart-1',
  mixed: 'bg-chart-3/15 text-chart-3',
  inaccurate: 'bg-destructive/10 text-destructive',
  unverified: 'bg-muted text-muted-foreground',
}

type VerdictBadgeProps = {
  verdict: Verdict
  status: ReportStatus
}

export default function VerdictBadge({ verdict, status }: VerdictBadgeProps) {
  if (status === 'analyzing') {
    return <Badge className="bg-primary/10 text-primary">Analyzing…</Badge>
  }
  if (status === 'failed') {
    return <Badge className="bg-muted text-muted-foreground">Failed</Badge>
  }
  return <Badge className={cn(verdictStyles[verdict])}>{verdictLabels[verdict]}</Badge>
}
