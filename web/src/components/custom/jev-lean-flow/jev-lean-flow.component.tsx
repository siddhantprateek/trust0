import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import ChartFigure from '@/components/custom/chart-figure/chart-figure.component'
import { pct } from '@/lib/format'
import { cn } from '@/lib/utils'

// JEV_MIN_CONFIDENCE default in src/app/config.py
const MIN_CONFIDENCE = 0.5

const options = ['unrated', 'left', 'lean-left', 'center', 'lean-right', 'right'] as const
type Option = (typeof options)[number]

const optionColor: Record<Option, string> = {
  unrated: 'var(--chart-5)',
  left: '#2563eb',
  'lean-left': '#60a5fa',
  center: '#a78bfa',
  'lean-right': '#f87171',
  right: '#dc2626',
}

// Illustrative answers, one per routing outcome
const examples: { id: string; label: string; evidence: string; probs: Record<Option, number> }[] = [
  {
    id: 'agree',
    label: 'Raters agree',
    evidence: 'AllSides rates its news coverage Lean Right. Media Bias/Fact Check rates it Right-Center.',
    probs: { unrated: 0.04, left: 0.01, 'lean-left': 0.02, center: 0.08, 'lean-right': 0.78, right: 0.07 },
  },
  {
    id: 'disagree',
    label: 'Raters disagree',
    evidence: 'One rater calls it Center. Another rates it Skews Right. A third has no rating.',
    probs: { unrated: 0.12, left: 0.01, 'lean-left': 0.03, center: 0.36, 'lean-right': 0.42, right: 0.06 },
  },
  {
    id: 'not-news',
    label: 'Not an outlet',
    evidence: 'A city government website. None of the raters list it.',
    probs: { unrated: 0.88, left: 0.01, 'lean-left': 0.02, center: 0.06, 'lean-right': 0.02, right: 0.01 },
  },
]

// Choice confidence: 1 when all probability is on one option, 0 when it is spread evenly
const confidence = (pMax: number) => (pMax - 1 / options.length) / (1 - 1 / options.length)

// Outlet lean in two steps: an LLM writes up the raters' evidence, Jev picks a lean, code routes on confidence
export default function JevLeanFlow() {
  const [exampleId, setExampleId] = useState(examples[0].id)
  const example = examples.find((e) => e.id === exampleId)!
  const top = options.reduce((a, b) => (example.probs[b] > example.probs[a] ? b : a))
  const conf = confidence(example.probs[top])
  const shown = top !== 'unrated' && conf >= MIN_CONFIDENCE

  const controls = (
    <div role="radiogroup" aria-label="Example outlet" className="inline-flex flex-wrap rounded-lg border p-0.5 text-xs">
      {examples.map((e) => (
        <button
          key={e.id}
          role="radio"
          aria-checked={exampleId === e.id}
          onClick={() => setExampleId(e.id)}
          className={cn(
            'rounded-md px-2.5 py-1 font-medium transition-colors',
            exampleId === e.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {e.label}
        </button>
      ))}
    </div>
  )

  return (
    <ChartFigure
      title="Rating an outlet nobody has rated"
      controls={controls}
      caption="Illustrative answers. Jev never sees the research model’s own label, “unrated” is listed first because Jev leans slightly toward the first option, and an answer below 0.5 confidence leaves the outlet unrated. Hover the bars for each option’s probability."
    >
      {({ width, showTip, hideTip }) => {
        const narrow = width < 600
        const colW = narrow ? width : (width - 2 * 28) / 3
        const colX = (i: number) => (narrow ? 0 : i * (colW + 28))
        const colY = (i: number) => (narrow ? i * 196 : 0)
        const height = narrow ? 3 * 196 - 16 : 180
        const barH = 15

        const card = (i: number, step: string, title: string) => (
          <g>
            <rect x={colX(i)} y={colY(i)} width={colW} height={180} rx={14} fill="var(--background)" stroke="var(--border)" />
            <text x={colX(i) + 16} y={colY(i) + 24} fontSize={10.5} fontWeight={600} letterSpacing="0.06em" fill="var(--muted-foreground)">
              {step}
            </text>
            <text x={colX(i) + 16} y={colY(i) + 44} fontSize={13} fontWeight={600} fill="var(--foreground)">
              {title}
            </text>
          </g>
        )

        return (
          <svg width={width} height={height} className="block overflow-visible" role="img" aria-label="Diagram of how an outlet lean is estimated">
            {/* Arrows between steps */}
            {!narrow &&
              [0, 1].map((i) => (
                <g key={i} stroke="var(--primary)" strokeWidth={1.5} fill="none">
                  <path d={`M${colX(i) + colW + 6},90 h16`} />
                  <path d={`M${colX(i) + colW + 17},85 l5,5 l-5,5`} />
                </g>
              ))}

            {/* 1. Research */}
            {card(0, '1 · RESEARCH MODEL', 'Writes up the evidence')}
            <foreignObject x={colX(0) + 16} y={colY(0) + 56} width={colW - 32} height={112}>
              <AnimatePresence mode="wait">
                <motion.p
                  key={example.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-lg bg-muted px-3 py-2 text-[12px] leading-relaxed text-foreground/80 italic"
                >
                  “{example.evidence}”
                </motion.p>
              </AnimatePresence>
            </foreignObject>

            {/* 2. Jev */}
            {card(1, '2 · JEV CHOICE', 'Picks one lean')}
            {options.map((o, k) => {
              const p = example.probs[o]
              const by = colY(1) + 58 + k * (barH + 4)
              const labelW = 66
              const maxW = colW - 32 - labelW - 36
              return (
                <g
                  key={o}
                  onPointerMove={(e) => showTip(e, <span className="font-mono">{o}: {pct(p, 0)}</span>)}
                  onPointerLeave={hideTip}
                  className="cursor-default"
                >
                  <text x={colX(1) + 16} y={by + 11} fontSize={11} fill={o === top ? 'var(--foreground)' : 'var(--muted-foreground)'} fontWeight={o === top ? 600 : 400}>
                    {o}
                  </text>
                  <rect x={colX(1) + 16 + labelW} y={by} width={maxW} height={barH} rx={4} fill="var(--muted)" />
                  <motion.rect
                    x={colX(1) + 16 + labelW}
                    y={by}
                    height={barH}
                    rx={4}
                    fill={optionColor[o]}
                    initial={false}
                    animate={{ width: Math.max(2, p * maxW) }}
                    transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                  />
                  <text x={colX(1) + colW - 16} y={by + 11} textAnchor="end" fontSize={10.5} className="tabular-nums" fill="var(--muted-foreground)">
                    {pct(p)}
                  </text>
                </g>
              )
            })}

            {/* 3. Code routes */}
            {card(2, '3 · CODE DECIDES', 'Shown or unrated?')}
            <g>
              <text x={colX(2) + 16} y={colY(2) + 74} fontSize={11.5} fill="var(--muted-foreground)">
                Confidence
              </text>
              <text x={colX(2) + colW - 16} y={colY(2) + 74} textAnchor="end" fontSize={12} fontWeight={700} className="tabular-nums" fill="var(--foreground)">
                {conf.toFixed(2)}
              </text>
              <rect x={colX(2) + 16} y={colY(2) + 84} width={colW - 32} height={8} rx={4} fill="var(--muted)" />
              <motion.rect
                x={colX(2) + 16}
                y={colY(2) + 84}
                height={8}
                rx={4}
                fill={shown ? 'var(--primary)' : 'var(--chart-5)'}
                initial={false}
                animate={{ width: Math.max(4, conf * (colW - 32)) }}
                transition={{ type: 'spring', stiffness: 200, damping: 26 }}
              />
              <line
                x1={colX(2) + 16 + MIN_CONFIDENCE * (colW - 32)}
                x2={colX(2) + 16 + MIN_CONFIDENCE * (colW - 32)}
                y1={colY(2) + 79}
                y2={colY(2) + 97}
                stroke="var(--foreground)"
                strokeWidth={1.5}
              />
              <text x={colX(2) + 16 + MIN_CONFIDENCE * (colW - 32)} y={colY(2) + 110} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">
                min 0.5
              </text>
              <AnimatePresence mode="wait">
                <motion.g
                  key={`${example.id}-${shown}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <rect
                    x={colX(2) + 16}
                    y={colY(2) + 124}
                    width={colW - 32}
                    height={40}
                    rx={10}
                    fill={shown ? optionColor[top] : 'var(--muted)'}
                    opacity={shown ? 0.16 : 1}
                  />
                  <text x={colX(2) + colW / 2} y={colY(2) + 148} textAnchor="middle" fontSize={12.5} fontWeight={600} fill="var(--foreground)">
                    {shown ? `Shown: ${top} · est.` : 'Left unrated'}
                  </text>
                </motion.g>
              </AnimatePresence>
            </g>
          </svg>
        )
      }}
    </ChartFigure>
  )
}
