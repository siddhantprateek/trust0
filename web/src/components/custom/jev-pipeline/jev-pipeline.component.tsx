import { useState } from 'react'
import { motion } from 'motion/react'
import ChartFigure from '@/components/custom/chart-figure/chart-figure.component'

type Step = { id: string; label: string; tip: string }
type Decision = { id: string; step: string; label: string; question: string; answer: string }

const steps: Step[] = [
  { id: 'ingest', label: 'Ingest', tip: 'Download the post, its media, captions and transcript.' },
  { id: 'fingerprint', label: 'Fingerprint', tip: 'Sample keyframes and hash them so re-uploads can be matched.' },
  { id: 'provenance', label: 'Provenance', tip: 'Trace the earliest appearance from visual matches, metadata, reverse search and research.' },
  { id: 'ai', label: 'AI detection', tip: 'trust0-vision-1 scores the keyframes; a second detector joins when configured.' },
  { id: 'facts', label: 'Fact check', tip: 'A research model extracts claims and verifies them against the web. Jev is not used here.' },
  { id: 'coverage', label: 'Coverage', tip: 'Find other outlets covering a news story and how coverage splits left, center and right.' },
  { id: 'score', label: 'Score', tip: 'Transparent rules turn the checks into a verdict and a 0–100 trust score. Jev is not used here.' },
]

const decisions: Decision[] = [
  {
    id: 'review',
    step: 'ai',
    label: 'Visual review',
    question: 'How was this frame made?',
    answer: 'Choice: camera · ai-generated · graphics, for four keyframes',
  },
  {
    id: 'relevance',
    step: 'coverage',
    label: 'Relevance',
    question: 'Is this a news report on the same event?',
    answer: 'Noul per article, up to 60 in one request; below 0.5 is dropped',
  },
  {
    id: 'lean',
    step: 'coverage',
    label: 'Outlet lean',
    question: 'Which lean does the raters’ evidence support?',
    answer: 'Choice: unrated · left · lean-left · center · lean-right · right',
  },
]

// Where Jev sits in a trust0 check: three narrow decisions hanging off the main pipeline
export default function JevPipeline() {
  const [active, setActive] = useState<string | null>(null)

  return (
    <ChartFigure
      title="Where Jev makes a call in a trust0 check"
      legend={
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm border border-foreground/40" /> trust0 pipeline step
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-primary" /> Jev decision
          </span>
        </>
      }
      caption="Jev answers three narrow questions. Research, fact checking and scoring stay with other parts of the pipeline. Hover or tab through any box for details."
    >
      {({ width, showTip, hideTip }) => {
        const vertical = width < 620
        const stepW = vertical ? Math.min(150, width * 0.4) : (width - 6 * 10) / 7
        const stepH = 40
        const decW = vertical ? width - stepW - 40 : Math.min(176, (width - 32) / 3)
        const decH = vertical ? 58 : 64

        // Step positions: one row on wide screens, a column on narrow ones
        const stepPos = steps.map((_, i) =>
          vertical ? { x: 0, y: i * (stepH + 14) } : { x: i * (stepW + 10), y: 0 },
        )
        const height = vertical ? steps.length * (stepH + 14) : stepH + 60 + decH + 4
        const stepIndex = (id: string) => steps.findIndex((s) => s.id === id)

        // Decision positions hang below (wide) or to the right (narrow) of their step
        const decPos = decisions.map((d, i) => {
          const p = stepPos[stepIndex(d.step)]
          if (vertical) {
            const mid = p.y + stepH / 2
            // The two coverage decisions stack above and below their step's midline
            const y = d.id === 'relevance' ? mid - decH - 4 : d.id === 'lean' ? mid + 4 : mid - decH / 2
            return { x: stepW + 40, y }
          }
          // An even row of three, centred between the two steps Jev hangs off, kept inside the figure
          const gap = 16
          const rowW = decisions.length * decW + (decisions.length - 1) * gap
          const ai = stepPos[stepIndex('ai')].x + stepW / 2
          const coverage = stepPos[stepIndex('coverage')].x + stepW / 2
          const start = Math.max(0, Math.min(width - rowW, (ai + coverage) / 2 - rowW / 2))
          return { x: start + i * (decW + gap), y: p.y + stepH + 60 }
        })

        const hover = (id: string, content: React.ReactNode) => ({
          tabIndex: 0,
          className: 'cursor-default outline-none',
          onPointerMove: (e: React.PointerEvent) => {
            setActive(id)
            showTip(e, content)
          },
          onFocus: (e: React.FocusEvent) => {
            setActive(id)
            showTip(e, content)
          },
          onPointerLeave: () => {
            setActive(null)
            hideTip()
          },
          onBlur: () => {
            setActive(null)
            hideTip()
          },
        })

        return (
          <svg width={width} height={height} className="block overflow-visible" role="img" aria-label="Diagram of the trust0 pipeline and the three decisions Jev makes">
            {/* Pipeline arrows */}
            {steps.slice(0, -1).map((s, i) => {
              const a = stepPos[i]
              const b = stepPos[i + 1]
              return vertical ? (
                <line key={s.id} x1={stepW / 2} x2={stepW / 2} y1={a.y + stepH} y2={b.y} stroke="var(--border)" strokeWidth={1.5} />
              ) : (
                <line key={s.id} x1={a.x + stepW} x2={b.x} y1={stepH / 2} y2={stepH / 2} stroke="var(--border)" strokeWidth={1.5} />
              )
            })}

            {/* Connectors from steps to Jev decisions */}
            {decisions.map((d, i) => {
              const s = stepPos[stepIndex(d.step)]
              const p = decPos[i]
              const lit = active === d.id || active === d.step
              const path = vertical
                ? `M${stepW},${s.y + stepH / 2} C${stepW + 20},${s.y + stepH / 2} ${stepW + 20},${p.y + decH / 2} ${p.x},${p.y + decH / 2}`
                : `M${s.x + stepW / 2},${stepH} C${s.x + stepW / 2},${stepH + 30} ${p.x + decW / 2},${p.y - 30} ${p.x + decW / 2},${p.y}`
              return (
                <motion.path
                  key={d.id}
                  d={path}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth={lit ? 2 : 1.5}
                  strokeDasharray="4 4"
                  opacity={lit ? 1 : 0.55}
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.15 }}
                />
              )
            })}

            {steps.map((s, i) => {
              const p = stepPos[i]
              const jev = decisions.some((d) => d.step === s.id)
              const lit = active === s.id || decisions.some((d) => d.id === active && d.step === s.id)
              return (
                <g key={s.id} {...hover(s.id, <TipBody title={s.label} body={s.tip} />)}>
                  <rect
                    x={p.x}
                    y={p.y}
                    width={stepW}
                    height={stepH}
                    rx={10}
                    fill={lit ? 'var(--muted)' : 'var(--background)'}
                    stroke={jev ? 'var(--primary)' : 'var(--border)'}
                    strokeWidth={jev ? 1.5 : 1}
                  />
                  <text x={p.x + stepW / 2} y={p.y + stepH / 2 + 4} textAnchor="middle" fontSize={stepW < 80 ? 11 : 12.5} fontWeight={500} fill="var(--foreground)">
                    {s.label}
                  </text>
                </g>
              )
            })}

            {decisions.map((d, i) => {
              const p = decPos[i]
              const lit = active === d.id
              return (
                <motion.g
                  key={d.id}
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.4, delay: 0.6 + i * 0.15 }}
                  {...hover(d.id, <TipBody title={`Jev · ${d.label}`} body={d.question} detail={d.answer} />)}
                >
                  <rect x={p.x} y={p.y} width={decW} height={decH} rx={12} fill="var(--primary)" opacity={lit ? 1 : 0.92} />
                  <text x={p.x + 14} y={p.y + 22} fontSize={10.5} fontWeight={600} fill="var(--primary-foreground)" opacity={0.75} letterSpacing="0.06em">
                    JEV
                  </text>
                  <text x={p.x + 14} y={p.y + 42} fontSize={13} fontWeight={600} fill="var(--primary-foreground)">
                    {d.label}
                  </text>
                </motion.g>
              )
            })}
          </svg>
        )
      }}
    </ChartFigure>
  )
}

function TipBody({ title, body, detail }: { title: string; body: string; detail?: string }) {
  return (
    <div className="max-w-60 space-y-1">
      <p className="font-semibold">{title}</p>
      <p className="leading-relaxed text-muted-foreground">{body}</p>
      {detail && <p className="font-mono text-[11px] leading-relaxed">{detail}</p>}
    </div>
  )
}
