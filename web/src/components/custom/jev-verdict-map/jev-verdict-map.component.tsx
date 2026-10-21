import { useState, type PointerEvent } from 'react'
import { motion } from 'motion/react'
import ChartFigure, { LegendItem, TipRow } from '@/components/custom/chart-figure/chart-figure.component'
import { pct } from '@/lib/format'
import { cn } from '@/lib/utils'

// Thresholds from src/app/pipeline/scoring.py
const AI_POSSIBLE = 0.4
const AI_LIKELY = 0.7
const AI_ALONE = 0.9
const REVIEW_AGREES = 0.5

type Call = 'likely' | 'disputed' | 'possible' | 'clear'

const calls: Record<Call, { label: string; verdict: string; color: string; why: string }> = {
  likely: { label: 'Likely AI', verdict: 'likely AI-generated', color: 'var(--destructive)', why: 'Two signals agree.' },
  disputed: {
    label: 'Disputed',
    verdict: 'unverified, both numbers shown',
    color: 'var(--chart-3)',
    why: 'The detector flags it, but the visual review says camera.',
  },
  possible: { label: 'Possible', verdict: 'unverified', color: 'var(--chart-4)', why: 'One weak or unconfirmed signal.' },
  clear: { label: 'Clear', verdict: 'no AI signal', color: 'var(--chart-1)', why: 'Neither signal points to AI.' },
}

// Same logic as ai_call() for a single detector
function call(detector: number, review: number | null): Call {
  const agrees = review !== null && review >= REVIEW_AGREES
  if (detector >= AI_LIKELY) {
    if (agrees) return 'likely'
    if (review !== null) return 'disputed'
    return detector >= AI_ALONE ? 'likely' : 'possible'
  }
  if (detector >= AI_POSSIBLE || agrees) return 'possible'
  return 'clear'
}

// Measured end to end through trust0 (see the table above)
const cases = [
  { name: 'Meghalaya landscape reel', truth: 'real', detector: 0.72, review: 0.19, before: 'likely' as Call },
  { name: 'Midjourney image', truth: 'AI', detector: 1.0, review: 0.91, before: 'likely' as Call },
  { name: 'FLUX image', truth: 'AI', detector: 1.0, review: 0.89, before: 'likely' as Call },
  { name: 'Dance commercial', truth: 'real', detector: 0.97, review: 0.6, before: 'likely' as Call },
]

const M = { top: 12, right: 12, bottom: 44, left: 48 }

// The "likely AI" rule as a map: detector score across, Jev's visual review up, coloured by the resulting call
export default function JevVerdictMap() {
  const [withReview, setWithReview] = useState(true)
  const [probe, setProbe] = useState<{ d: number; r: number } | null>(null)

  const controls = (
    <div role="radiogroup" aria-label="Visual review" className="inline-flex rounded-lg border p-0.5 text-xs">
      {[
        { value: true, label: 'With visual review' },
        { value: false, label: 'Detector only' },
      ].map((o) => (
        <button
          key={o.label}
          role="radio"
          aria-checked={withReview === o.value}
          onClick={() => setWithReview(o.value)}
          className={cn(
            'rounded-md px-2.5 py-1 font-medium transition-colors',
            withReview === o.value ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )

  return (
    <ChartFigure
      title="How trust0 decides “likely AI”"
      controls={controls}
      legend={(Object.keys(calls) as Call[]).map((c) => (
        <LegendItem key={c} color={calls[c].color} label={calls[c].label} />
      ))}
      caption={
        withReview
          ? 'Move across the map to see the call for any pair of scores. Dots are real checks: a hollow ring marks real footage, a filled dot an AI image. Jev alone can never make something “likely AI”, and it can’t clear media the detector flagged: disagreement becomes “disputed”.'
          : 'Without a visual review, one detector has to reach 90% on its own. This is how the Meghalaya reel was flagged before: 72% would now only be “possible”, and with Jev’s review it is “disputed”.'
      }
    >
      {({ width, showTip, hideTip }) => {
        const innerW = width - M.left - M.right
        const innerH = withReview ? Math.min(320, Math.max(220, innerW * 0.6)) : 64
        const height = M.top + innerH + M.bottom
        const x = (v: number) => M.left + v * innerW
        const y = (v: number) => M.top + (1 - v) * innerH

        const regions: { x0: number; x1: number; y0: number; y1: number; c: Call }[] = withReview
          ? [
              { x0: 0, x1: AI_POSSIBLE, y0: 0, y1: REVIEW_AGREES, c: 'clear' },
              { x0: 0, x1: AI_POSSIBLE, y0: REVIEW_AGREES, y1: 1, c: 'possible' },
              { x0: AI_POSSIBLE, x1: AI_LIKELY, y0: 0, y1: 1, c: 'possible' },
              { x0: AI_LIKELY, x1: 1, y0: 0, y1: REVIEW_AGREES, c: 'disputed' },
              { x0: AI_LIKELY, x1: 1, y0: REVIEW_AGREES, y1: 1, c: 'likely' },
            ]
          : [
              { x0: 0, x1: AI_POSSIBLE, y0: 0, y1: 1, c: 'clear' },
              { x0: AI_POSSIBLE, x1: AI_ALONE, y0: 0, y1: 1, c: 'possible' },
              { x0: AI_ALONE, x1: 1, y0: 0, y1: 1, c: 'likely' },
            ]

        const move = (e: PointerEvent<SVGRectElement>) => {
          const box = e.currentTarget.getBoundingClientRect()
          const d = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width))
          const r = Math.min(1, Math.max(0, 1 - (e.clientY - box.top) / box.height))
          setProbe({ d, r })
          const c = call(d, withReview ? r : null)
          showTip(
            e,
            <div className="space-y-1">
              <p className="font-semibold" style={{ color: calls[c].color }}>
                {calls[c].label}
              </p>
              <TipRow label="Detector" value={pct(d)} />
              {withReview && <TipRow label="Visual review" value={pct(r)} />}
              <p className="pt-1 text-muted-foreground">
                {calls[c].why} Verdict: {calls[c].verdict}.
              </p>
            </div>,
          )
        }

        return (
          <svg width={width} height={height} className="block overflow-visible" role="img" aria-label="Decision map for the likely AI rule">
            {regions.map((g, i) => (
              <motion.rect
                key={`${withReview}-${i}`}
                x={x(g.x0)}
                y={y(g.y1)}
                width={x(g.x1) - x(g.x0)}
                height={y(g.y0) - y(g.y1)}
                fill={calls[g.c].color}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.16 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              />
            ))}
            {regions.map((g, i) => {
              const w = x(g.x1) - x(g.x0)
              const h = y(g.y0) - y(g.y1)
              if (w < 70 || h < 30) return null
              return (
                <text
                  key={`l${i}`}
                  x={x(g.x0) + w / 2}
                  y={y(g.y1) + (withReview ? 20 : h / 2 + 4)}
                  textAnchor="middle"
                  fontSize={11.5}
                  fontWeight={600}
                  fill={calls[g.c].color}
                  className="pointer-events-none"
                >
                  {calls[g.c].label}
                </text>
              )
            })}

            {/* Threshold lines */}
            {(withReview ? [AI_POSSIBLE, AI_LIKELY] : [AI_POSSIBLE, AI_ALONE]).map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={M.top} y2={M.top + innerH} stroke="var(--foreground)" strokeOpacity={0.25} strokeDasharray="3 3" />
                <text x={x(t)} y={M.top + innerH + 16} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--foreground)">
                  {pct(t)}
                </text>
              </g>
            ))}
            {withReview && (
              <g>
                <line x1={M.left} x2={M.left + innerW} y1={y(REVIEW_AGREES)} y2={y(REVIEW_AGREES)} stroke="var(--foreground)" strokeOpacity={0.25} strokeDasharray="3 3" />
                {[0, REVIEW_AGREES, 1].map((t) => (
                  <text key={t} x={M.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fontWeight={t === REVIEW_AGREES ? 600 : 400} fill={t === REVIEW_AGREES ? 'var(--foreground)' : 'var(--muted-foreground)'}>
                    {pct(t)}
                  </text>
                ))}
                <text transform={`translate(12 ${M.top + innerH / 2}) rotate(-90)`} textAnchor="middle" fontSize={11.5} fill="var(--muted-foreground)">
                  Jev visual review
                </text>
              </g>
            )}
            {[0, 1].map((t) => (
              <text key={`x${t}`} x={x(t)} y={M.top + innerH + 16} textAnchor={t ? 'end' : 'start'} fontSize={11} fill="var(--muted-foreground)">
                {pct(t)}
              </text>
            ))}
            <text x={M.left + innerW / 2} y={height - 6} textAnchor="middle" fontSize={11.5} fill="var(--muted-foreground)">
              AI-image detector score
            </text>

            {/* Hover surface */}
            <rect
              x={M.left}
              y={M.top}
              width={innerW}
              height={innerH}
              fill="transparent"
              className="cursor-crosshair"
              onPointerMove={move}
              onPointerLeave={() => {
                setProbe(null)
                hideTip()
              }}
            />
            {probe && (
              <g className="pointer-events-none">
                <line x1={x(probe.d)} x2={x(probe.d)} y1={M.top} y2={M.top + innerH} stroke="var(--foreground)" strokeOpacity={0.5} />
                {withReview && <line x1={M.left} x2={M.left + innerW} y1={y(probe.r)} y2={y(probe.r)} stroke="var(--foreground)" strokeOpacity={0.5} />}
              </g>
            )}

            {withReview &&
              cases.map((c, i) => {
                const now = call(c.detector, c.review)
                const tip = (
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {c.name} <span className="font-normal text-muted-foreground">· {c.truth}</span>
                    </p>
                    <TipRow label="Detector" value={pct(c.detector)} />
                    <TipRow label="Visual review" value={pct(c.review)} />
                    <TipRow label="Before" value={calls[c.before].label} />
                    <TipRow label="Now" value={calls[now].label} color={calls[now].color} />
                  </div>
                )
                const real = c.truth === 'real'
                return (
                  <motion.g
                    key={c.name}
                    tabIndex={0}
                    aria-label={`${c.name}: detector ${pct(c.detector)}, review ${pct(c.review)}, now ${calls[now].label}`}
                    className="cursor-pointer outline-none [&:focus-visible_circle]:stroke-foreground"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.3 + i * 0.1 }}
                    style={{ transformOrigin: `${x(c.detector)}px ${y(c.review)}px` }}
                    onPointerMove={(e) => {
                      e.stopPropagation()
                      showTip(e, tip)
                    }}
                    onPointerLeave={hideTip}
                    onFocus={(e) => showTip(e, tip)}
                    onBlur={hideTip}
                  >
                    <circle cx={x(c.detector)} cy={y(c.review)} r={14} fill="transparent" />
                    <circle
                      cx={x(c.detector)}
                      cy={y(c.review)}
                      r={7}
                      fill={real ? 'var(--background)' : 'var(--foreground)'}
                      stroke="var(--foreground)"
                      strokeWidth={2}
                    />
                    {width > 520 && (
                      <text
                        x={x(c.detector) - 12}
                        y={y(c.review) + (c.name.startsWith('FLUX') ? 16 : c.name.startsWith('Midjourney') ? -10 : 4)}
                        textAnchor="end"
                        fontSize={11}
                        fontWeight={500}
                        fill="var(--foreground)"
                        className="pointer-events-none"
                      >
                        {c.name}
                      </text>
                    )}
                  </motion.g>
                )
              })}
          </svg>
        )
      }}
    </ChartFigure>
  )
}
