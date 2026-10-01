import { cn } from '@/lib/utils'

type TrustScoreProps = {
  score: number
  className?: string
}

function scoreColor(score: number) {
  if (score < 35) return 'bg-destructive'
  if (score < 70) return 'bg-chart-3'
  return 'bg-chart-1'
}

export default function TrustScore({ score, className }: TrustScoreProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', scoreColor(score))} style={{ width: `${score}%` }} />
      </div>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">{score}</span>
    </div>
  )
}
