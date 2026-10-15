import {
  Boxes,
  Check,
  CircleDot,
  Copy,
  FileJson,
  Image as ImageIcon,
  KeyRound,
  Layers,
  Link2,
  Sparkles,
  Tag,
  Video,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CodeBlock from '@/components/custom/code-block/code-block.component'
import ModelFactGrid, { type ModelFact } from '@/components/custom/model-fact-grid/model-fact-grid.component'
import ModelStatRow, { type ModelStat } from '@/components/custom/model-stat-row/model-stat-row.component'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useModel } from '@/hooks/use-models'
import { API_URL } from '@/lib/api'
import type { ModelStatus } from '@/lib/types'

const statusLabels: Record<ModelStatus, string> = {
  available: 'Available',
  offline: 'Not loaded on this server',
  'coming-soon': 'Coming soon',
}

const statusVariants = {
  available: 'default',
  offline: 'destructive',
  'coming-soon': 'secondary',
} as const satisfies Record<ModelStatus, string>

export default function ModelDetailPage() {
  const { modelId } = useParams()
  const { model, loading, error } = useModel(modelId)
  const [copiedId, setCopiedId] = useState(false)

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (error || !model) {
    return <p className="text-sm text-muted-foreground">{error ?? 'Model not found.'}</p>
  }

  const requestExample = `curl -X POST ${API_URL}${model.endpoint} \\
  -H "Authorization: Bearer $TRUST0_API_KEY" \\
  -F "model=${model.id}" \\
  -F "file=@photo.jpg"`

  const responseExample = `{
  "model": "${model.id}",
  "label": "${model.labels[0] ?? 'artificial'}",
  "aiGenerated": 0.9731,
  "scores": { ${model.labels.map((label) => `"${label}": 0.97`).join(', ')} }
}`

  const inputIsImage = model.inputs.some((input) => input.startsWith('image/'))
  const inputIsVideo = model.inputs.some((input) => input.startsWith('video/'))

  const stats: ModelStat[] = [
    { label: 'Status', value: statusLabels[model.status], hint: model.status === 'offline' ? 'Checkpoint not configured' : undefined, icon: CircleDot },
    { label: 'Task', value: model.task, icon: Tag },
    { label: 'Input', value: inputIsImage ? 'Image' : inputIsVideo ? 'Video' : model.inputs[0] || '—', hint: model.inputs.join(', '), icon: inputIsVideo ? Video : ImageIcon },
    { label: 'Labels', value: model.labels.join(' / '), icon: Sparkles },
  ]

  const modalityFacts: ModelFact[] = [
    { title: 'Image', subtitle: inputIsImage ? model.inputs.filter((i) => i.startsWith('image/')).join(', ') : 'Not supported', icon: ImageIcon, supported: inputIsImage },
    { title: 'Video', subtitle: inputIsVideo ? model.inputs.filter((i) => i.startsWith('video/')).join(', ') : 'Not supported', icon: Video, supported: inputIsVideo },
    { title: 'JSON output', subtitle: model.endpoint ? `label, aiGenerated, scores` : 'Not available yet', icon: FileJson, supported: Boolean(model.endpoint) },
  ]

  const capabilityFacts: ModelFact[] = [
    { title: 'API key required', subtitle: 'Bearer token, created in Settings', icon: KeyRound, supported: true },
    { title: 'Self-hosted inference', subtitle: "Runs on this server, not a third party", icon: Boxes, supported: true },
    { title: 'Streaming', subtitle: 'Single response per request', icon: Zap, supported: false },
    { title: 'Batch inference', subtitle: 'One file per request', icon: Layers, supported: false },
  ]

  async function copyId() {
    if (!model) return
    await navigator.clipboard.writeText(model.id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 1500)
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-foreground ring-1 ring-foreground/10">
              <Boxes className="size-5" strokeWidth={2.25} />
            </span>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-xl font-semibold tracking-tight">{model.name}</h1>
              <Badge variant={statusVariants[model.status]}>{statusLabels[model.status]}</Badge>
              <Button type="button" variant="ghost" size="icon-xs" onClick={copyId} aria-label="Copy model id">
                {copiedId ? <Check /> : <Copy />}
              </Button>
            </div>
          </div>
          {model.endpoint && (
            <Button variant="outline" asChild>
              <Link to="/settings/api-keys">
                <KeyRound data-icon="inline-start" />
                Get an API key
              </Link>
            </Button>
          )}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">{model.description}</p>
      </div>

      <ModelStatRow stats={stats} />

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-2 text-sm text-muted-foreground">
          {model.endpoint && <p className="font-mono text-xs break-all">POST {model.endpoint}</p>}
        </div>
        {model.notes.length > 0 && (
          <ul className="space-y-2.5">
            {model.notes.map((note) => (
              <li key={note} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Sparkles className="mt-0.5 size-3.5 shrink-0" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {model.endpoint && (
        <>
          <hr />
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold">Try it</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Create a key under{' '}
                <Link to="/settings/api-keys" className="text-foreground underline underline-offset-4">
                  Settings → API keys
                </Link>
                , then call the endpoint directly.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <CodeBlock filename="Request" code={requestExample} language="bash" />
              <CodeBlock filename="Response" code={responseExample} language="json" />
            </div>
          </section>
        </>
      )}

      <hr />
      <ModelFactGrid title="Modalities" facts={modalityFacts} />

      {model.endpoint && (
        <>
          <hr />
          <ModelFactGrid
            title="Endpoint"
            description="This model's REST endpoint and how it authenticates."
            facts={[{ title: 'REST', subtitle: `POST ${model.endpoint}`, icon: Link2, supported: true }]}
          />
          <hr />
          <ModelFactGrid title="Capabilities" facts={capabilityFacts} />
        </>
      )}
    </div>
  )
}
