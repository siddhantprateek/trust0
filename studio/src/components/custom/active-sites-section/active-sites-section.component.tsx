import { Globe, Loader2, Plus, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useActiveSites } from '@/hooks/use-active-sites'

export default function ActiveSitesSection() {
  const { sites, loading, error, add, remove, isPending } = useActiveSites()
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const domain = value.trim()
    if (!domain) return
    setSubmitting(true)
    try {
      await add(domain)
      setValue('')
    } catch (err) {
      toast.error('Could not add that website', { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove(domain: string) {
    try {
      await remove(domain)
    } catch (err) {
      toast.error('Could not remove that website', { description: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active websites</CardTitle>
        <CardDescription>
          The trust0 browser extension shows chips automatically only on these websites. A right-click check (on a
          selection, link, image or page) always works anywhere, regardless of this list.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="example.com"
            aria-label="Website domain"
            disabled={submitting}
          />
          <Button type="submit" disabled={submitting || !value.trim()}>
            {submitting ? <Loader2 className="animate-spin" /> : <Plus data-icon="inline-start" />}
            Add
          </Button>
        </form>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : sites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No websites yet. Add one above to turn chips on there.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {sites.map((site) => (
              <li key={site.domain} className="flex items-center gap-2.5 px-3 py-2 text-sm">
                <Globe className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-mono">{site.domain}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemove(site.domain)}
                  disabled={isPending(site.domain)}
                  aria-label={`Remove ${site.domain}`}
                >
                  {isPending(site.domain) ? <Loader2 className="animate-spin" /> : <X />}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
