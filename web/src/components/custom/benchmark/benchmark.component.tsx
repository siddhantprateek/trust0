import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { conditions, generators, models, type Condition, type ConditionResult } from '@/data/benchmarks'
import { fadeUp, stagger } from '@/lib/motion'
import { pct } from '@/lib/format'
import { cn } from '@/lib/utils'

type Metric = {
  id: string
  label: string
  note: string
  lowerIsBetter?: boolean
  read: (r: ConditionResult) => number
  show: (v: number) => string
}

const metrics: Metric[] = [
  { id: 'caught', label: 'AI images caught', note: 'Share of AI images it flags.', read: (r) => r.aiCaught, show: (v) => pct(v) },
  {
    id: 'false',
    label: 'Real photos flagged',
    note: 'False alarms on real photos. Lower is better.',
    lowerIsBetter: true,
    read: (r) => r.realFlagged,
    show: (v) => pct(v, 1),
  },
  { id: 'auc', label: 'Overall quality (AUC)', note: '0.5 is a coin toss, 1.0 is perfect.', read: (r) => r.auc, show: (v) => v.toFixed(2) },
]

// A pill group used for both controls
function Pills<T extends string>({ items, value, onChange }: { items: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border p-0.5 text-sm">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            'min-h-10 rounded-md px-3 py-1.5 font-medium transition-colors sm:min-h-0',
            item.id === value ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default function Benchmark() {
  const [condition, setCondition] = useState<Condition>('social')
  const [metricId, setMetricId] = useState('caught')
  const [selected, setSelected] = useState(models[0].id)

  const metric = metrics.find((m) => m.id === metricId)!
  const cond = conditions.find((c) => c.id === condition)!
  const ranked = [...models].sort((a, b) => {
    const d = metric.read(b.results[condition]) - metric.read(a.results[condition])
    return metric.lowerIsBetter ? -d : d
  })
  const model = models.find((m) => m.id === selected)!
  const weak = generators.filter((g) => model.results[condition].byGenerator[g.id] < 0.5)

  return (
    <section id="benchmark" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-[88rem] px-4">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          className="max-w-2xl"
        >
          <motion.p variants={fadeUp} className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <span className="size-2 bg-primary" /> Benchmark
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-3xl font-medium tracking-tight sm:text-4xl">
            We built our own detector.
            <br />
            Then we tried to break it.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-muted-foreground">
            1,380 images, 11 generators, and the three ways a picture really travels: as downloaded, as a social upload,
            and as a screenshot of a repost. Pick a condition and a measure, then click a model to see where it stumbles.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-5">
            <Link
              to="/blog/introducing-trust0-vision-1"
              className="group inline-flex min-h-10 items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary"
            >
              Read how we built and tested it
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </motion.div>

        <div className="mt-10 rounded-2xl border bg-card p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Pills items={conditions} value={condition} onChange={setCondition} />
            <Pills items={metrics} value={metricId} onChange={setMetricId} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {cond.detail}. {metric.note}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Test set: 1,380 held-out images, 930 AI from 11 generators and 450 real (300 ImageNet photos, 150 FFHQ
            faces). Real-photo false alarms are measured on the 300 ImageNet photos.
          </p>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
            <ul className="space-y-2">
              {ranked.map((m) => {
                const v = metric.read(m.results[condition])
                const on = m.id === selected
                return (
                  <motion.li key={m.id} layout transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
                    <button
                      type="button"
                      onClick={() => setSelected(m.id)}
                      aria-pressed={on}
                      className={cn(
                        'w-full rounded-xl border px-4 py-3 text-left transition-colors',
                        on ? 'border-foreground/40 bg-muted/60' : 'border-transparent hover:bg-muted/40',
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className={cn('text-sm', m.ours ? 'font-semibold' : 'text-muted-foreground')}>{m.name}</span>
                        <span className="font-mono text-sm tabular-nums">{metric.show(v)}</span>
                      </div>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: m.color }}
                          initial={false}
                          animate={{ width: `${Math.max(v, 0.012) * 100}%` }}
                          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                      {metric.id !== 'false' && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Flags {pct(m.results[condition].realFlagged, 1)} of real photos
                        </p>
                      )}
                    </button>
                  </motion.li>
                )
              })}
            </ul>

            <div>
              <p className="text-sm font-medium">
                {model.name} <span className="font-normal text-muted-foreground">· AI images caught, by generator</span>
              </p>
              <ul className="mt-4 space-y-2.5">
                {generators.map((g) => {
                  const v = model.results[condition].byGenerator[g.id]
                  return (
                    <li key={g.id} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 text-xs">
                      <span className="truncate text-muted-foreground">{g.label}</span>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: model.color, opacity: v < 0.5 ? 0.4 : 1 }}
                          initial={false}
                          animate={{ width: `${Math.max(v, 0.012) * 100}%` }}
                          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                      <span className="text-right font-mono tabular-nums">{pct(v)}</span>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                {weak.length
                  ? `Below half on ${weak.map((g) => g.label).join(', ')}.`
                  : 'Above half on every generator we tested.'}{' '}
                Based on {generators.reduce((n, g) => n + g.count, 0)} AI images.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
