// Styled after Pasta UI's Environment Variables component (https://pastaui.com/docs/component/environment-variables):
// a header with a count and an Add action, and a divided list of masked rows with hover actions.
import { KeyRound, Loader2, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import CodeBlock from '@/components/custom/code-block/code-block.component'
import ConfirmDialog from '@/components/custom/confirm-dialog/confirm-dialog.component'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiKeys } from '@/hooks/use-api-keys'
import { formatDate } from '@/lib/format'

const actionClass =
  'rounded-full text-muted-foreground opacity-0 transition-opacity duration-150 ease-out group-focus-within:opacity-100 group-hover:opacity-100 hover:text-foreground pointer-coarse:opacity-100'

export default function ApiKeysSection() {
  const { keys, loading, error, create, revoke, isPending } = useApiKeys()
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // The full key, shown once right after it's created, inside the same dialog
  const [newKey, setNewKey] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSubmitting(true)
    try {
      const created = await create(trimmed)
      setNewKey(created.key)
    } catch (err) {
      toast.error('Could not create the key', { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setSubmitting(false)
    }
  }

  function closeAddDialog(open: boolean) {
    setAddOpen(open)
    if (!open) {
      setName('')
      setNewKey(null)
    }
  }

  return (
    <section className="overflow-hidden rounded-xl bg-card text-sm ring-1 ring-foreground/10">
      <header className="relative flex min-h-14 items-center gap-2 border-b px-5 py-3">
        <KeyRound className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Secret keys</h3>
        <span className="ml-auto text-[13px] text-muted-foreground/70 tabular-nums">
          {loading ? '…' : `${keys.length} configured`}
        </span>
        <Button
          className="h-7 rounded-full bg-foreground/8 px-2.5 text-xs text-foreground/85 hover:bg-foreground/12 hover:text-foreground"
          onClick={() => setAddOpen(true)}
          size="xs"
          type="button"
          variant="ghost"
        >
          <Plus data-icon="inline-start" /> Add
        </Button>
      </header>

      {loading ? (
        <div className="space-y-2 p-5">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <p className="p-5 text-sm text-muted-foreground">{error}</p>
      ) : keys.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">No keys yet. Add one to start using the API.</p>
      ) : (
        <ul>
          {keys.map((key) => (
            <li key={key.id} className="group relative flex min-h-16 items-center gap-3 border-b px-5 py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-0 truncate font-mono text-[13px] text-foreground">{key.name}</span>
                  <span className="rounded-md bg-foreground/6 px-1.5 py-px text-xs text-muted-foreground">
                    {key.lastUsedAt ? `Last used ${formatDate(key.lastUsedAt)}` : 'Never used'}
                  </span>
                </div>
                <p className="mt-1 truncate font-mono text-[13px] text-muted-foreground">
                  {key.prefix}••••••••••••••••••••
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  aria-label={`Revoke ${key.name}`}
                  className={actionClass}
                  onClick={() => setRevokeTarget({ id: key.id, name: key.name })}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                  disabled={isPending(key.id)}
                >
                  {isPending(key.id) ? <Loader2 className="animate-spin" /> : <Trash2 />}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={addOpen} onOpenChange={closeAddDialog}>
        <DialogContent>
          {newKey ? (
            <>
              <DialogHeader>
                <DialogTitle>Save your key</DialogTitle>
                <DialogDescription>
                  This is the only time the full key is shown. Copy it now; if you lose it, revoke it and create a new one.
                </DialogDescription>
              </DialogHeader>
              <CodeBlock code={newKey} filename="Secret key" language="text" />
              <DialogFooter>
                <Button type="button" onClick={() => closeAddDialog(false)}>
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>New secret key</DialogTitle>
                <DialogDescription>Name it after where it'll be used, so you can tell keys apart later.</DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Production backend"
                  maxLength={100}
                  disabled={submitting}
                  autoFocus
                />
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => closeAddDialog(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || !name.trim()}>
                  {submitting ? <Loader2 className="animate-spin" /> : null}
                  Create key
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title={`Revoke "${revokeTarget?.name}"?`}
        description="Anything using this key stops working immediately. This can't be undone."
        confirmLabel="Revoke key"
        onConfirm={async () => {
          if (!revokeTarget) return
          try {
            await revoke(revokeTarget.id)
          } catch (err) {
            toast.error('Could not revoke the key', { description: err instanceof Error ? err.message : String(err) })
          }
        }}
      />
    </section>
  )
}
