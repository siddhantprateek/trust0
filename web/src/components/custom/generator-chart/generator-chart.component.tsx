import { useState } from 'react'
import { motion } from 'motion/react'
import ChartFigure, { LegendItem, TipRow } from '@/components/custom/chart-figure/chart-figure.component'
import { pct } from '@/lib/format'
import { conditions, generators, models, type Condition } from '@/data/benchmarks'
import { cn } from '@/lib/utils'

const ROW = 34
const M = { top: 8, right: 44, bottom: 30 }

// Share of each generator's images every model catches, one row per generator
export default function GeneratorChart({ initial = 'social' }: { initial?: Condition }) {
  const [condition, setCondition] = useState<Condition>(initial)
  const [row, setRow] = useState<string | null>(null)

  const controls = (
    <div role="radiogroup" aria-label="Image condition" className="inline-flex rounded-lg border p-0.5 text-xs">
      {conditions.map((c) => (
        <button
          key={c.id}
          role="radio"
          aria-checked={condition === c.id}
          onClick={() => setCondition(c.id)}
          className={cn(
            'rounded-md px-2.5 py-1 font-medium transition-colors',
            condition === c.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  )

  return (
    <ChartFigure
      title="AI images caught, by generator"
      controls={controls}
      legend={models.map((m) => (
        <LegendItem key={m.id} color={m.color} label={m.name} strong={m.ours} />
      ))}
      caption={`${conditions.find((c) => c.id === condition)!.detail}. Switch conditions to see how each detector holds up as images are recompressed. Hover a row for exact numbers.`}
    >
      {({ width, showTip, hideTip }) => {
        const labelW = width < 480 ? 104 : 150
        const innerW = width - labelW - M.right
        const height = M.top + generators.length * ROW + M.bottom
        const x = (v: number) => labelW + v * innerW

        return (
          <svg width={width} height={height} className="block overflow-visible" role="img" aria-label="Dot plot of detection rate per generator">
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={M.top} y2={height - M.bottom} stroke="var(--border)" />
                <text x={x(t)} y={height - 10} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
                  {pct(t)}
                </text>
              </g>
            ))}

            {generators.map((g, gi) => {
              const cy = M.top + gi * ROW + ROW / 2
              const values = models.map((m) => ({ m, v: m.results[condition].byGenerator[g.id] }))
              const lo = Math.min(...values.map((d) => d.v))
              const hi = Math.max(...values.map((d) => d.v))
              const tip = (
                <div className="space-y-1">
                  <p className="font-semibold">
                    {g.label} <span className="font-normal text-muted-foreground">· {g.count} images</span>
                  </p>
                  {values.map(({ m, v }) => (
                    <TipRow key={m.id} label={m.name} value={pct(v)} color={m.color} />
                  ))}
                </div>
              )
              const enter = (e: Parameters<typeof showTip>[0]) => {
                setRow(g.id)
                showTip(e, tip)
              }
              const leave = () => {
                setRow(null)
                hideTip()
              }
              return (
                <g
                  key={g.id}
                  tabIndex={0}
                  aria-label={`${g.label}: ${values.map(({ m, v }) => `${m.name} ${pct(v)}`).join(', ')}`}
                  className="cursor-default outline-none"
                  onPointerMove={enter}
                  onPointerLeave={leave}
                  onFocus={enter}
                  onBlur={leave}
                >
                  <rect
                    x={0}
                    y={cy - ROW / 2}
                    width={width}
                    height={ROW}
                    rx={6}
                    fill={row === g.id ? 'var(--muted)' : 'transparent'}
                    opacity={0.7}
                  />
                  <text x={labelW - 12} y={cy + 4} textAnchor="end" fontSize={12} fill="var(--foreground)">
                    {g.label}
                  </text>
                  <line x1={x(lo)} x2={x(hi)} y1={cy} y2={cy} stroke="var(--border)" strokeWidth={3} strokeLinecap="round" />
                  {[...values].reverse().map(({ m, v }) => (
                    <motion.circle
                      key={m.id}
                      cy={cy}
                      r={m.ours ? 6.5 : 5}
                      fill={m.color}
                      stroke="var(--background)"
                      strokeWidth={1.5}
                      opacity={m.ours ? 1 : 0.85}
                      initial={false}
                      animate={{ cx: x(v) }}
                      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                    />
                  ))}
                  <text
                    x={width - M.right + 10}
                    y={cy + 4}
                    fontSize={11.5}
                    fontWeight={700}
                    fill="var(--primary)"
                    className="tabular-nums"
                  >
                    {pct(values[0].v)}
                  </text>
                </g>
              )
            })}
          </svg>
        )
      }}
    </ChartFigure>
  )
}
