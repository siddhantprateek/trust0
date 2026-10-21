import { useState } from 'react'
import { motion } from 'motion/react'
import ChartFigure, { LegendItem, TipRow } from '@/components/custom/chart-figure/chart-figure.component'
import { pct } from '@/lib/format'
import { conditions, models, type Condition } from '@/data/benchmarks'

const HEIGHT = 340
const M = { top: 16, right: 20, bottom: 46, left: 46 }
const X_MAX = 0.4

const marker: Record<string, string> = { original: 'O', social: 'S', repost: 'R' }

// Where each model's name sits, picked so the labels don't collide
const labels: Record<string, { at: Condition; dx: number; dy: number }> = {
  'trust0-vision-1': { at: 'social', dx: 14, dy: 4 },
  smogy: { at: 'repost', dx: -10, dy: -14 },
  ateeqq: { at: 'social', dx: 14, dy: 4 },
  'umm-maybe': { at: 'original', dx: 14, dy: 4 },
}

// What each model catches versus what it falsely accuses, with a trail from original -> social -> repost
export default function TradeoffChart() {
  const [active, setActive] = useState<string | null>(null)

  return (
    <ChartFigure
      title="AI images caught vs. real photos wrongly flagged"
      legend={models.map((m) => (
        <LegendItem key={m.id} color={m.color} label={m.name} strong={m.ours} />
      ))}
      caption="Each trail follows one model from the original images (O) through social-media compression (S) to a reposted screenshot (R). Up and to the left is better. A model drifting right is accusing more real photos as images get compressed."
    >
      {({ width, showTip, hideTip }) => {
        const innerW = width - M.left - M.right
        const innerH = HEIGHT - M.top - M.bottom
        const x = (v: number) => M.left + (Math.min(v, X_MAX) / X_MAX) * innerW
        const y = (v: number) => M.top + innerH * (1 - v)

        return (
          <svg width={width} height={HEIGHT} className="block overflow-visible" role="img" aria-label="Scatter plot of detection rate against false alarm rate">
            <defs>
              <linearGradient id="better" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.1} />
                <stop offset="60%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <rect x={M.left} y={M.top} width={innerW} height={innerH} fill="url(#better)" />
            <text x={M.left + 10} y={M.top + 18} fontSize={11} fontWeight={600} fill="var(--primary)">
              ↖ better
            </text>

            {[0, 0.1, 0.2, 0.3, 0.4].map((t) => (
              <g key={`x${t}`}>
                <line x1={x(t)} x2={x(t)} y1={M.top} y2={M.top + innerH} stroke="var(--border)" />
                <text x={x(t)} y={M.top + innerH + 16} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
                  {pct(t)}
                </text>
              </g>
            ))}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <g key={`y${t}`}>
                <line x1={M.left} x2={M.left + innerW} y1={y(t)} y2={y(t)} stroke="var(--border)" />
                <text x={M.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
                  {pct(t)}
                </text>
              </g>
            ))}
            <text x={M.left + innerW / 2} y={HEIGHT - 6} textAnchor="middle" fontSize={11.5} fill="var(--muted-foreground)">
              Real photos flagged as AI (false alarms)
            </text>
            <text
              transform={`translate(12 ${M.top + innerH / 2}) rotate(-90)`}
              textAnchor="middle"
              fontSize={11.5}
              fill="var(--muted-foreground)"
            >
              AI images caught
            </text>

            {models.map((m, mi) => {
              const points = conditions.map((c) => ({ c, r: m.results[c.id] }))
              const dim = active !== null && active !== m.id
              const label = labels[m.id]
              const at = m.results[label.at]
              const lx = x(at.realFlagged) + label.dx
              return (
                <g key={m.id} opacity={dim ? 0.2 : 1} className="transition-opacity">
                  <motion.path
                    d={points.map((p, i) => `${i ? 'L' : 'M'}${x(p.r.realFlagged)},${y(p.r.aiCaught)}`).join(' ')}
                    fill="none"
                    stroke={m.color}
                    strokeWidth={m.ours ? 2.5 : 1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.9, delay: mi * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  />
                  {points.map(({ c, r }) => {
                    const tip = (
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {m.name} · {c.label}
                        </p>
                        <TipRow label="AI images caught" value={pct(r.aiCaught, 1)} color={m.color} />
                        <TipRow label="Real photos flagged" value={pct(r.realFlagged, 1)} />
                        <TipRow label="Real faces flagged" value={pct(r.realFacesFlagged)} />
                      </div>
                    )
                    const enter = (e: Parameters<typeof showTip>[0]) => {
                      setActive(m.id)
                      showTip(e, tip)
                    }
                    const leave = () => {
                      setActive(null)
                      hideTip()
                    }
                    return (
                      <g
                        key={c.id}
                        tabIndex={0}
                        aria-label={`${m.name}, ${c.label}: catches ${pct(r.aiCaught)}, flags ${pct(r.realFlagged)} of real photos`}
                        className="cursor-pointer outline-none [&:focus-visible_circle]:stroke-foreground"
                        onPointerMove={enter}
                        onPointerLeave={leave}
                        onFocus={enter}
                        onBlur={leave}
                      >
                        <circle cx={x(r.realFlagged)} cy={y(r.aiCaught)} r={14} fill="transparent" />
                        <circle
                          cx={x(r.realFlagged)}
                          cy={y(r.aiCaught)}
                          r={m.ours ? 9 : 8}
                          fill="var(--background)"
                          stroke={m.color}
                          strokeWidth={2}
                        />
                        <text
                          x={x(r.realFlagged)}
                          y={y(r.aiCaught) + 3.5}
                          textAnchor="middle"
                          fontSize={9.5}
                          fontWeight={700}
                          fill={m.color}
                          className="pointer-events-none"
                        >
                          {marker[c.id]}
                        </text>
                      </g>
                    )
                  })}
                  <text
                    x={lx}
                    y={y(at.aiCaught) + label.dy}
                    textAnchor={label.dx < 0 || lx + 90 > width ? 'end' : 'start'}
                    fontSize={11.5}
                    fontWeight={m.ours ? 700 : 500}
                    fill={m.ours ? 'var(--foreground)' : 'var(--muted-foreground)'}
                    className="pointer-events-none"
                  >
                    {m.name}
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
