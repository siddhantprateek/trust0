import { useState } from 'react'
import { motion } from 'motion/react'
import ChartFigure, { LegendItem, TipRow } from '@/components/custom/chart-figure/chart-figure.component'
import { pct } from '@/lib/format'
import { conditions, models } from '@/data/benchmarks'

const HEIGHT = 300
const M = { top: 24, right: 8, bottom: 44, left: 34 }

// AUC for every model under each image condition, grouped by condition
export default function AucChart() {
  const [active, setActive] = useState<string | null>(null)

  return (
    <ChartFigure
      title="Detection quality (ROC AUC) by image condition"
      legend={models.map((m) => (
        <LegendItem key={m.id} color={m.color} label={m.name} strong={m.ours} />
      ))}
      caption="AUC is the chance a randomly chosen AI image scores higher than a randomly chosen real one: 0.5 is a coin toss, 1.0 is perfect. Hover or tab through the bars for accuracy and error rates."
    >
      {({ width, showTip, hideTip }) => {
        const innerW = width - M.left - M.right
        const innerH = HEIGHT - M.top - M.bottom
        const groupW = innerW / conditions.length
        const gap = Math.max(3, groupW * 0.03)
        const barW = Math.min(44, (groupW * 0.78 - gap * (models.length - 1)) / models.length)
        const y = (v: number) => M.top + innerH * (1 - v)

        return (
          <svg width={width} height={HEIGHT} className="block overflow-visible" role="img" aria-label="Bar chart of AUC by model and condition">
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <g key={t}>
                <line
                  x1={M.left}
                  x2={width - M.right}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--border)"
                  strokeDasharray={t === 0.5 ? '4 4' : undefined}
                  strokeWidth={t === 0 ? 1.25 : 1}
                />
                <text x={M.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
                  {t}
                </text>
              </g>
            ))}
            <text x={M.left - 8} y={y(0.5) + 15} textAnchor="end" fontSize={9} fill="var(--muted-foreground)">
              chance
            </text>

            {conditions.map((c, ci) => {
              const groupX = M.left + ci * groupW + (groupW - (barW * models.length + gap * (models.length - 1))) / 2
              return (
                <g key={c.id}>
                  {models.map((m, mi) => {
                    const r = m.results[c.id]
                    const x = groupX + mi * (barW + gap)
                    const dim = active !== null && active !== m.id
                    const tip = (
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {m.name} · {c.label}
                        </p>
                        <TipRow label="AUC" value={r.auc.toFixed(3)} color={m.color} />
                        <TipRow label="Accuracy" value={pct(r.accuracy, 1)} />
                        <TipRow label="AI images caught" value={pct(r.aiCaught, 1)} />
                        <TipRow label="Real photos flagged" value={pct(r.realFlagged, 1)} />
                      </div>
                    )
                    return (
                      <g key={m.id}>
                        <motion.rect
                          x={x}
                          width={barW}
                          rx={Math.min(5, barW / 4)}
                          fill={m.color}
                          initial={{ y: y(0), height: 0 }}
                          whileInView={{ y: y(r.auc), height: y(0) - y(r.auc) }}
                          viewport={{ once: true, amount: 0.4 }}
                          transition={{ duration: 0.7, delay: ci * 0.12 + mi * 0.05, ease: [0.22, 1, 0.36, 1] }}
                          opacity={dim ? 0.25 : m.ours ? 1 : 0.8}
                          tabIndex={0}
                          aria-label={`${m.name}, ${c.label}: AUC ${r.auc.toFixed(2)}`}
                          className="cursor-pointer outline-none transition-opacity focus-visible:stroke-foreground focus-visible:stroke-2"
                          onPointerMove={(e) => {
                            setActive(m.id)
                            showTip(e, tip)
                          }}
                          onPointerLeave={() => {
                            setActive(null)
                            hideTip()
                          }}
                          onFocus={(e) => {
                            setActive(m.id)
                            showTip(e, tip)
                          }}
                          onBlur={() => {
                            setActive(null)
                            hideTip()
                          }}
                        />
                        {barW >= 22 && (
                          <text
                            x={x + barW / 2}
                            y={y(r.auc) - 6}
                            textAnchor="middle"
                            fontSize={m.ours ? 11.5 : 10.5}
                            fontWeight={m.ours ? 700 : 500}
                            fill={m.ours ? 'var(--foreground)' : 'var(--muted-foreground)'}
                            opacity={dim ? 0.3 : 1}
                            className="pointer-events-none tabular-nums"
                          >
                            {r.auc.toFixed(2)}
                          </text>
                        )}
                      </g>
                    )
                  })}
                  <text x={M.left + ci * groupW + groupW / 2} y={HEIGHT - 22} textAnchor="middle" fontSize={12.5} fontWeight={600} fill="var(--foreground)">
                    {c.label}
                  </text>
                  <text x={M.left + ci * groupW + groupW / 2} y={HEIGHT - 7} textAnchor="middle" fontSize={10.5} fill="var(--muted-foreground)">
                    {width > 560 ? c.detail : ''}
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
