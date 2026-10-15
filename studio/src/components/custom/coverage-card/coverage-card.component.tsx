import { ChevronDown, ChevronUp, EyeOff } from 'lucide-react'
import { HoverCard as HoverCardPrimitive } from 'radix-ui'
import { useLayoutEffect, useRef, useState } from 'react'
import Favicon from '@/components/custom/favicon/favicon.component'
import LeanBadge from '@/components/custom/lean-badge/lean-badge.component'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LinkHoverPreview } from '@/components/ui/link-hover-preview'
import { leanLabels, leanSide } from '@/lib/format'
import type { Coverage, CoverageSource } from '@/lib/types'
import { cn } from '@/lib/utils'

type Side = 'left' | 'center' | 'right'
const SIDES: { side: Side; label: string; short: string; bar: string; dot: string }[] = [
  { side: 'left', label: 'Left', short: 'L', bar: 'bg-lean-left', dot: 'bg-lean-left' },
  { side: 'center', label: 'Center', short: 'C', bar: 'bg-lean-center', dot: 'bg-lean-center' },
  { side: 'right', label: 'Right', short: 'R', bar: 'bg-lean-right', dot: 'bg-lean-right' },
]

type Filter = 'all' | Side
const PAGE_SIZE = 8

function formatPublished(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  // SerpAPI sometimes gives a display string ("2 hours ago") rather than a date
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

const FILTERS = ['all', 'left', 'center', 'right'] as const

export default function CoverageCard({ coverage }: { coverage: Coverage }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState(false)
  const tabRefs = useRef<Record<Filter, HTMLButtonElement | null>>({ all: null, left: null, center: null, right: null })
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false })

  useLayoutEffect(() => {
    const el = tabRefs.current[filter]
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth, ready: true })
  }, [filter, coverage])
  const rated = coverage.left + coverage.center + coverage.right
  const pct = { left: coverage.leftPct, center: coverage.centerPct, right: coverage.rightPct }
  const counts = { left: coverage.left, center: coverage.center, right: coverage.right }
  const bySide = {
    left: coverage.sources.filter((s) => leanSide(s.lean) === 'left'),
    center: coverage.sources.filter((s) => leanSide(s.lean) === 'center'),
    right: coverage.sources.filter((s) => leanSide(s.lean) === 'right'),
  }

  const filtered = filter === 'all' ? coverage.sources : coverage.sources.filter((s) => leanSide(s.lean) === filter)
  const visible = expanded ? filtered : filtered.slice(0, PAGE_SIZE)
  const hiddenCount = filtered.length - visible.length

  function selectFilter(value: Filter) {
    setFilter(value)
    setExpanded(false)
  }

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Coverage &amp; bias</CardTitle>
        <CardDescription>
          {coverage.sources.length} {coverage.sources.length === 1 ? 'outlet' : 'outlets'} covering this story
          {coverage.query && <> · searched for &ldquo;{coverage.query}&rdquo;</>}. Lean is rated per outlet, not per
          fact: a claim is true or false whoever reports it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium">Bias distribution</p>
          {rated > 0 ? (
            <div
              className="flex h-8 overflow-hidden rounded-md text-xs font-semibold text-white"
              role="img"
              aria-label={SIDES.map((s) => `${s.label} ${pct[s.side]}%`).join(', ')}
            >
              {SIDES.filter((s) => pct[s.side] > 0).map((s) => (
                <SegmentTooltip key={s.side} label={s.label} outlets={bySide[s.side]} total={rated}>
                  <button
                    type="button"
                    onClick={() => selectFilter(s.side)}
                    className={cn('flex min-w-9 items-center justify-center px-2 transition-[width,filter] duration-500 hover:brightness-110', s.bar)}
                    style={{ width: `${pct[s.side]}%` }}
                  >
                    {pct[s.side] >= 12 ? `${s.label} ${pct[s.side]}%` : `${s.short} ${pct[s.side]}%`}
                  </button>
                </SegmentTooltip>
              ))}
            </div>
          ) : (
            <div className="flex h-8 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
              None of these outlets could be rated
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {SIDES.map((s) => `${counts[s.side]} ${s.label.toLowerCase()}`).join(' · ')}
            {coverage.unrated > 0 && ` · ${coverage.unrated} unrated`}
          </p>
        </div>

        {(coverage.blindspot || coverage.subjectOutlet) && (
          <div className="flex flex-wrap gap-2">
            {coverage.blindspot && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-chart-3/12 px-2.5 py-1.5 text-xs font-medium text-chart-3">
                <EyeOff className="size-3.5" />
                Blindspot: few {coverage.blindspot === 'left' ? 'left' : 'right'}-leaning outlets are covering this
              </span>
            )}
            {coverage.subjectOutlet && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs">
                Checked article: <span className="font-medium">{coverage.subjectOutlet}</span>
                <LeanBadge lean={coverage.subjectLean} />
              </span>
            )}
          </div>
        )}

        {coverage.sources.length > 0 && (
          <div className="space-y-3">
            <div className="relative flex gap-5 border-b" role="tablist" aria-label="Filter outlets by lean">
              {FILTERS.map((value) => {
                const count = value === 'all' ? coverage.sources.length : counts[value]
                const dot = value === 'all' ? null : SIDES.find((s) => s.side === value)?.dot
                return (
                  <button
                    key={value}
                    ref={(el) => {
                      tabRefs.current[value] = el
                    }}
                    type="button"
                    role="tab"
                    aria-selected={filter === value}
                    disabled={count === 0}
                    onClick={() => selectFilter(value)}
                    className={cn(
                      'flex items-center gap-1.5 pb-2 text-sm font-medium transition-colors disabled:opacity-40',
                      filter === value ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {dot && <span aria-hidden className={cn('size-2 rounded-full', dot)} />}
                    {value === 'all' ? 'All' : leanLabels[value]}
                    <span className="text-xs text-muted-foreground">{count}</span>
                  </button>
                )
              })}
              <span
                aria-hidden
                className={cn(
                  'absolute bottom-0 h-0.5 rounded-full bg-foreground transition-[left,width] duration-300 ease-out',
                  !indicator.ready && 'opacity-0',
                )}
                style={{ left: indicator.left, width: indicator.width }}
              />
            </div>

            <ul className="divide-y">
              {visible.map((source) => (
                <li key={source.domain} className="flex items-start gap-3 py-2.5 text-sm first:pt-0">
                  <span
                    aria-hidden
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      SIDES.find((s) => s.side === leanSide(source.lean))?.dot ?? 'bg-muted-foreground/30',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Favicon domain={source.domain} size={14} />
                      <span className="font-medium">{source.outlet}</span>
                      <LeanBadge lean={source.lean} estimated={source.rating === 'estimated'} confidence={source.leanConfidence} />
                      {formatPublished(source.publishedAt) && (
                        <span className="text-xs text-muted-foreground">{formatPublished(source.publishedAt)}</span>
                      )}
                    </div>
                    <LinkHoverPreview url={source.url} className="mt-0.5 line-clamp-1 text-muted-foreground hover:text-foreground hover:underline">
                      {source.title || source.url}
                    </LinkHoverPreview>
                  </div>
                </li>
              ))}
            </ul>

            {(hiddenCount > 0 || expanded) && filtered.length > PAGE_SIZE && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {expanded ? (
                  <>
                    Show fewer <ChevronUp className="size-3.5" />
                  </>
                ) : (
                  <>
                    Show {hiddenCount} more <ChevronDown className="size-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        )}

        <p className="border-t pt-3 text-xs text-muted-foreground">
          Outlet ratings are approximate and follow public media-bias raters (AllSides, Ad Fontes Media, Media
          Bias/Fact Check). &ldquo;est.&rdquo; marks an outlet outside the curated list, rated from what those raters
          publish; outlets the model isn&rsquo;t confident about are left unrated.
        </p>
      </CardContent>
    </Card>
  )
}

const SEGMENT_PREVIEW = 8

type SegmentTooltipProps = {
  label: string
  outlets: CoverageSource[]
  total: number
  children: React.ReactNode
}

/** Hovering a bar segment lists which outlets make it up, so "Right 53%" is backed by names, not just a number. */
function SegmentTooltip({ label, outlets, total, children }: SegmentTooltipProps) {
  const extra = outlets.length - SEGMENT_PREVIEW
  return (
    <HoverCardPrimitive.Root openDelay={120} closeDelay={80}>
      <HoverCardPrimitive.Trigger asChild>{children}</HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          side="top"
          align="center"
          sideOffset={8}
          className="z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <p className="text-xs font-semibold">
            {label} · {outlets.length} of {total} rated outlets
          </p>
          <ul className="mt-2 space-y-1">
            {outlets.slice(0, SEGMENT_PREVIEW).map((o) => (
              <li key={o.domain} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Favicon domain={o.domain} size={12} />
                  <span className="truncate">{o.outlet}</span>
                </span>
                {o.rating === 'estimated' && <span className="shrink-0 text-muted-foreground">est.</span>}
              </li>
            ))}
          </ul>
          {extra > 0 && <p className="mt-1.5 text-xs text-muted-foreground">+{extra} more — click to filter the list below</p>}
          <HoverCardPrimitive.Arrow className="fill-popover" />
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  )
}
