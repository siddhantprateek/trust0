import { Boxes, FileSearch, FileText, Globe, KeyRound, LayoutDashboard, PlusCircle, Search, UserCog, type LucideIcon } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DialogOverlay, DialogPortal } from '@/components/ui/dialog'
import { useReports } from '@/hooks/use-reports'
import { cn } from '@/lib/utils'

type PaletteItem = {
  id: string
  label: string
  hint?: string
  icon: LucideIcon
  to: string
  group: 'Navigate' | 'Reports'
}

const navItems: Omit<PaletteItem, 'group'>[] = [
  { id: 'nav-overview', label: 'Overview', icon: LayoutDashboard, to: '/' },
  { id: 'nav-new-check', label: 'New check', icon: PlusCircle, to: '/checks/new' },
  { id: 'nav-reports', label: 'Reports', icon: FileSearch, to: '/reports' },
  { id: 'nav-models', label: 'Models', icon: Boxes, to: '/models' },
  { id: 'nav-allow-list', label: 'Allow list', hint: 'Settings', icon: Globe, to: '/settings/allow-list' },
  { id: 'nav-api-keys', label: 'API keys', hint: 'Settings', icon: KeyRound, to: '/settings/api-keys' },
  { id: 'nav-account', label: 'Account', hint: 'Settings', icon: UserCog, to: '/settings/account' },
]

type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          data-slot="command-palette"
          className="fixed top-[16vh] left-1/2 z-50 grid w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 gap-0 overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Search reports and jump to any page</DialogPrimitive.Description>
          {/* Mounted only while open, so its query/selection state starts fresh each time rather than needing a reset effect */}
          {open && <PaletteBody onClose={() => onOpenChange(false)} />}
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  )
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { data: reports } = useReports()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = useMemo<PaletteItem[]>(() => {
    const nav = navItems.map((item) => ({ ...item, group: 'Navigate' as const }))
    const q = query.trim().toLowerCase()
    // Reports only show up once the user searches for one — there can be dozens, and nobody
    // wants to scroll past all of them just to jump to "New check"
    if (!q) return nav

    const reportItems = reports.map((report) => ({
      id: `report-${report.id}`,
      label: report.title || report.url,
      hint: report.verdict,
      icon: FileText,
      to: `/reports/${report.id}`,
      group: 'Reports' as const,
    }))
    return [...nav, ...reportItems].filter(
      (item) => item.label.toLowerCase().includes(q) || item.hint?.toLowerCase().includes(q),
    )
  }, [query, reports])

  const groups = useMemo(() => {
    const map = new Map<string, PaletteItem[]>()
    for (const item of items) {
      const list = map.get(item.group) ?? []
      list.push(item)
      map.set(item.group, list)
    }
    return [...map.entries()]
  }, [items])

  function select(item: PaletteItem) {
    onClose()
    navigate(item.to)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, items.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const item = items[activeIndex]
      if (item) select(item)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 border-b px-3">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          // Radix focuses the content's first focusable descendant on open, which is this input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={onKeyDown}
          placeholder="Search reports and pages…"
          className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="max-h-80 overflow-y-auto p-1.5">
        {items.length === 0 && <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">No results.</p>}
        {groups.map(([group, groupItems]) => (
          <div key={group} className="mb-1 last:mb-0">
            <p className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">{group}</p>
            {groupItems.map((item) => {
              const index = items.indexOf(item)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => select(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm',
                    index === activeIndex ? 'bg-accent text-accent-foreground' : 'text-foreground',
                  )}
                >
                  <item.icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint && <span className="shrink-0 text-xs text-muted-foreground">{item.hint}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}
