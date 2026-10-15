import { Boxes, ChevronDown, Eye, EyeOff, FlaskConical, Loader2, Play, Upload, X } from 'lucide-react'
import { Collapsible as CollapsiblePrimitive } from 'radix-ui'
import { useEffect, useState, type DragEvent, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import CodeBlock from '@/components/custom/code-block/code-block.component'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiKeys } from '@/hooks/use-api-keys'
import { useModels } from '@/hooks/use-models'
import { API_URL } from '@/lib/api'
import { formatFileSize } from '@/lib/format'
import type { ModelInfo, VisionPrediction } from '@/lib/types'
import { cn } from '@/lib/utils'

const API_KEY_STORAGE = 'trust0:playground:api-key'

async function runPrediction(model: ModelInfo, file: File, apiKey: string): Promise<VisionPrediction> {
  if (!model.endpoint) throw new Error(`${model.name} has no endpoint yet.`)
  const body = new FormData()
  body.append('model', model.id)
  body.append('file', file)
  const response = await fetch(`${API_URL}${model.endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body,
  })
  if (!response.ok) {
    let detail = ''
    try {
      const data = await response.json()
      detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail ?? '')
    } catch {
      // not JSON
    }
    throw new Error(detail || `API error ${response.status}`)
  }
  return response.json()
}

/** A collapsible settings group, styled after OpenAI Platform's left-panel sections (Prompt, Model, Audio, …). */
function PanelSection({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <CollapsiblePrimitive.Root defaultOpen={defaultOpen} className="border-b">
      <CollapsiblePrimitive.Trigger className="group/trigger flex w-full items-center justify-between px-4 py-3 text-sm font-medium">
        {title}
        <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/trigger:rotate-180" />
      </CollapsiblePrimitive.Trigger>
      <CollapsiblePrimitive.Content className="space-y-3 px-4 pb-4">{children}</CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  )
}

export default function PlaygroundPage() {
  const { models, loading: modelsLoading } = useModels()
  const { create: createApiKey } = useApiKeys()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<VisionPrediction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [keyDialogOpen, setKeyDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  useEffect(() => {
    setApiKey(localStorage.getItem(API_KEY_STORAGE) ?? '')
  }, [])

  useEffect(() => {
    const runnable = models.filter((m) => m.endpoint)
    if (runnable.length > 0 && !selectedId) setSelectedId(runnable[0].id)
  }, [models, selectedId])

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const model = models.find((m) => m.id === selectedId) ?? null

  function updateApiKey(value: string) {
    setApiKey(value)
    if (value.trim()) localStorage.setItem(API_KEY_STORAGE, value.trim())
    else localStorage.removeItem(API_KEY_STORAGE)
  }

  async function handleCreateKey(event: FormEvent) {
    event.preventDefault()
    const trimmed = newKeyName.trim()
    if (!trimmed) return
    setCreatingKey(true)
    try {
      const created = await createApiKey(trimmed)
      setCreatedKey(created.key)
      updateApiKey(created.key)
    } catch (err) {
      toast.error('Could not create the key', { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setCreatingKey(false)
    }
  }

  function closeKeyDialog(open: boolean) {
    setKeyDialogOpen(open)
    if (!open) {
      setNewKeyName('')
      setCreatedKey(null)
    }
  }

  function pickFile(next: File | null) {
    setFile(next)
    setResult(null)
    setError(null)
  }

  const onDragOver = (event: DragEvent) => {
    event.preventDefault()
    setDragging(true)
  }
  const onDragLeave = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
  }
  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) pickFile(dropped)
  }

  async function run() {
    if (!model || !file || !apiKey.trim()) return
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      setResult(await runPrediction(model, file, apiKey.trim()))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex h-[calc(100svh-3.5rem)] w-full flex-col lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b lg:w-80 lg:border-r lg:border-b-0">
        <div className="flex-1 overflow-y-auto">
        <div className="border-b px-4 py-3">
          <h1 className="text-sm font-semibold">Playground</h1>
          <p className="mt-1 text-xs text-muted-foreground">Call trust0's models with your own API key.</p>
        </div>

        <PanelSection title="Model">
          {modelsLoading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : (
            models.map((m) => {
              const disabled = !m.endpoint
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelectedId(m.id)}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    selectedId === m.id ? 'border-foreground bg-foreground/5' : 'hover:bg-muted',
                  )}
                >
                  <Boxes className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-mono text-sm font-medium">{m.name}</span>
                      {m.status !== 'available' && (
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {m.status === 'coming-soon' ? 'Coming soon' : 'Offline'}
                        </Badge>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{m.task}</span>
                  </span>
                </button>
              )
            })
          )}
        </PanelSection>

        <PanelSection title="API key">
          <div className="relative">
            <Input
              id="playground-key"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(event) => updateApiKey(event.target.value)}
              placeholder="t0_..."
              className="pr-9 font-mono text-xs"
              autoComplete="off"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="absolute top-1/2 right-1 -translate-y-1/2"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Stored only in this browser.{' '}
            <button
              type="button"
              onClick={() => setKeyDialogOpen(true)}
              className="underline underline-offset-4 hover:text-foreground"
            >
              Create a key
            </button>
          </p>
        </PanelSection>

        {model?.endpoint && (
          <div className="space-y-1.5 border-b px-4 py-3">
            <p className="text-sm font-medium">Endpoint</p>
            <p className="font-mono text-sm break-all text-foreground">
              <span className="text-muted-foreground">POST</span> {model.endpoint}
            </p>
          </div>
        )}
        </div>

        <div className="shrink-0 border-t p-4">
          <Button type="button" onClick={run} disabled={!model?.endpoint || !file || !apiKey.trim() || running} className="w-full">
            {running ? <Loader2 className="animate-spin" /> : <Play />}
            {running ? 'Running…' : 'Run'}
          </Button>
        </div>
      </aside>

      <Dialog open={keyDialogOpen} onOpenChange={closeKeyDialog}>
        <DialogContent>
          {createdKey ? (
            <>
              <DialogHeader>
                <DialogTitle>Save your key</DialogTitle>
                <DialogDescription>
                  This is the only time the full key is shown. It's already filled in on the left.
                </DialogDescription>
              </DialogHeader>
              <CodeBlock code={createdKey} filename="Secret key" language="text" />
              <DialogFooter>
                <Button type="button" onClick={() => closeKeyDialog(false)}>
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleCreateKey}>
              <DialogHeader>
                <DialogTitle>New secret key</DialogTitle>
                <DialogDescription>Name it after where it'll be used, so you can tell keys apart later.</DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="playground-key-name">Name</Label>
                <Input
                  id="playground-key-name"
                  value={newKeyName}
                  onChange={(event) => setNewKeyName(event.target.value)}
                  placeholder="Playground"
                  maxLength={100}
                  disabled={creatingKey}
                  autoFocus
                />
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => closeKeyDialog(false)} disabled={creatingKey}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creatingKey || !newKeyName.trim()}>
                  {creatingKey ? <Loader2 className="animate-spin" /> : null}
                  Create key
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-8">
          {!result && !error && !running && (
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                <FlaskConical className="size-5 text-muted-foreground" />
              </span>
              <p className="text-sm font-medium">{model ? `Try ${model.name}` : 'Pick a model to get started'}</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Upload a file below and run it through the model to see the raw response.
              </p>
            </div>
          )}

          {running && (
            <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              Running…
            </div>
          )}

          {error && !running && <p className="w-full max-w-xl rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

          {result && !running && (
            <div className="w-full max-w-xl space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="text-sm capitalize">{result.label}</Badge>
                <span className="text-sm text-muted-foreground">{Math.round(result.aiGenerated * 100)}% likely AI-generated</span>
              </div>
              <Progress value={result.aiGenerated * 100} />
              <ul className="space-y-1.5">
                {Object.entries(result.scores).map(([label, score]) => (
                  <li key={label} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground capitalize">{label}</span>
                    <span className="font-mono tabular-nums">{(score * 100).toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
              <CodeBlock filename="Response" code={JSON.stringify(result, null, 2)} language="json" />
            </div>
          )}
        </div>

        {file && previewUrl ? (
          <div className="relative flex h-80 shrink-0 items-center justify-center border-t bg-muted/20">
            {file.type.startsWith('video/') ? (
              <video src={previewUrl} className="max-h-full max-w-full object-contain" muted playsInline controls />
            ) : (
              <img src={previewUrl} alt="" className="max-h-full max-w-full object-contain" />
            )}
            <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 bg-gradient-to-b from-background/90 to-transparent p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <Button type="button" variant="secondary" size="icon-sm" aria-label="Remove file" onClick={() => pickFile(null)}>
                <X />
              </Button>
            </div>
          </div>
        ) : (
          <label
            htmlFor="playground-file"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
              'flex h-80 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 border-t border-dashed text-center transition-colors hover:bg-muted',
              dragging && 'border-primary bg-primary/5',
            )}
          >
            <Upload className="size-6 shrink-0 text-muted-foreground" />
            <span className="text-sm font-medium">{dragging ? 'Drop to upload' : 'Choose a file or drag it here'}</span>
            <span className="text-xs text-muted-foreground">{model?.inputs.join(', ') ?? 'Pick a model first'}</span>
          </label>
        )}
        <input
          id="playground-file"
          type="file"
          accept={model?.inputs.join(',') ?? 'image/*'}
          className="sr-only"
          onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
        />
      </main>
    </div>
  )
}
