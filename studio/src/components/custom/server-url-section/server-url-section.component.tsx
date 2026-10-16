import { Check, RotateCcw, Server } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { API_URL, DEFAULT_API_URL, getApiUrlOverride, setApiUrlOverride } from '@/lib/api'

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export default function ServerUrlSection() {
  const [value, setValue] = useState(getApiUrlOverride() ?? DEFAULT_API_URL)
  const hasOverride = getApiUrlOverride() !== null

  const trimmed = value.trim()
  const valid = isValidUrl(trimmed)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    setApiUrlOverride(trimmed)
    toast.success('Server URL saved', { description: 'Reload the page for the new backend to take effect.' })
  }

  function handleReset() {
    setApiUrlOverride(null)
    setValue(DEFAULT_API_URL)
    toast.success('Reset to the default server URL', { description: 'Reload the page for this to take effect.' })
  }

  return (
    <section className="overflow-hidden rounded-xl bg-card text-sm ring-1 ring-foreground/10">
      <header className="flex min-h-14 items-center gap-2 border-b px-5 py-3">
        <Server className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Backend server URL</h3>
      </header>

      <form className="space-y-4 p-5" onSubmit={handleSubmit}>
        <p className="text-muted-foreground">
          Point the studio at a different backend — useful when tunnelling a local backend (e.g. with ngrok or
          cloudflared) for testing against this frontend.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="server-url">Server URL</Label>
          <Input
            id="server-url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://your-tunnel.example.com"
            autoComplete="off"
            spellCheck={false}
          />
          {!valid && trimmed.length > 0 && <p className="text-xs text-destructive">Enter a valid http(s) URL.</p>}
        </div>

        <p className="text-xs text-muted-foreground">
          Currently connected to <span className="font-mono text-foreground">{API_URL}</span>
          {hasOverride ? ' (overridden)' : ' (default)'}
        </p>

        <div className="flex gap-2">
          <Button type="submit" disabled={!valid || trimmed === (getApiUrlOverride() ?? DEFAULT_API_URL)}>
            <Check data-icon="inline-start" /> Save
          </Button>
          <Button type="button" variant="outline" onClick={handleReset} disabled={!hasOverride}>
            <RotateCcw data-icon="inline-start" /> Reset to default
          </Button>
        </div>
      </form>
    </section>
  )
}
