import { leanLabels, leanSide } from '@/lib/format'
import type { Lean } from '@/lib/types'
import { cn } from '@/lib/utils'

const sideStyles = {
  left: 'bg-lean-left/12 text-lean-left',
  center: 'bg-lean-center/18 text-muted-foreground',
  right: 'bg-lean-right/12 text-lean-right',
} as const

type LeanBadgeProps = {
  lean: Lean | null | undefined
  estimated?: boolean
  className?: string
}

/** An outlet's political lean, colored by its side of the Left / Center / Right bar. */
export default function LeanBadge({ lean, estimated, className }: LeanBadgeProps) {
  const side = leanSide(lean)
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[11px] leading-4 font-medium whitespace-nowrap',
        side ? sideStyles[side] : 'bg-muted text-muted-foreground',
        className,
      )}
      title={estimated ? 'Estimated rating: this outlet is not in the curated ratings table' : undefined}
    >
      {lean ? leanLabels[lean] : 'Unrated'}
      {estimated && lean && <span className="opacity-70">· est.</span>}
    </span>
  )
}
