import type { ComponentType } from 'react'
import AucChart from '@/components/custom/auc-chart/auc-chart.component'
import ConditionsDiagram from '@/components/custom/conditions-diagram/conditions-diagram.component'
import GeneratorChart from '@/components/custom/generator-chart/generator-chart.component'
import JevLeanFlow from '@/components/custom/jev-lean-flow/jev-lean-flow.component'
import JevPipeline from '@/components/custom/jev-pipeline/jev-pipeline.component'
import JevVerdictMap from '@/components/custom/jev-verdict-map/jev-verdict-map.component'
import TradeoffChart from '@/components/custom/tradeoff-chart/tradeoff-chart.component'
import { models, type Condition } from '@/data/benchmarks'

type EmbedProps = { params: Record<string, string> }

function Scorecard({ params }: EmbedProps) {
  const condition = (params.condition ?? 'social') as Condition
  const r = models.find((m) => m.ours)!.results[condition]
  const stats = [
    { value: r.auc.toFixed(2), label: 'ROC AUC' },
    { value: `${Math.round(r.aiCaught * 100)}%`, label: 'AI images caught' },
    { value: `${(r.realFlagged * 100).toFixed(1)}%`, label: 'Real photos flagged' },
    { value: `${Math.round(r.msPerImage)} ms`, label: 'Per image, laptop GPU' },
  ]
  return (
    <div className="my-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-background p-5">
          <p className="font-serif text-3xl font-medium tracking-tight text-foreground tabular-nums">{s.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

// Names usable in a ```chart block. The first word picks the embed, the rest are key=value params:
//
// ```chart
// generators condition=repost
// ```
const embeds: Record<string, ComponentType<EmbedProps>> = {
  scorecard: Scorecard,
  conditions: () => <ConditionsDiagram />,
  auc: () => <AucChart />,
  tradeoff: () => <TradeoffChart />,
  generators: ({ params }) => <GeneratorChart initial={params.condition as Condition | undefined} />,
  'jev-pipeline': () => <JevPipeline />,
  'jev-lean': () => <JevLeanFlow />,
  'jev-verdicts': () => <JevVerdictMap />,
}

export default function BlogEmbed({ spec }: { spec: string }) {
  const [name, ...rest] = spec.split(/\s+/)
  const params = Object.fromEntries(rest.map((p) => p.split('=') as [string, string]))
  const Embed = embeds[name]
  if (!Embed) {
    return import.meta.env.DEV ? (
      <p className="my-6 rounded-lg border border-destructive/40 p-3 text-sm text-destructive">Unknown chart "{name}"</p>
    ) : null
  }
  return <Embed params={params} />
}
