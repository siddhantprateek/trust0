import type { LucideIcon } from 'lucide-react'

export type ModelStat = {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
}

/** The bordered row of small stats atop a model's detail page (status, task, input, labels…). */
export default function ModelStatRow({ stats }: { stats: ModelStat[] }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y overflow-hidden rounded-lg border md:grid-cols-4 md:divide-y-0">
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0 space-y-2 px-4 py-3">
          <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">{stat.label}</p>
          <div className="flex items-center gap-1.5">
            <stat.icon className="size-3.5 shrink-0 text-muted-foreground" />
            <p className="truncate text-sm font-medium">{stat.value}</p>
          </div>
          {stat.hint && <p className="truncate text-xs text-muted-foreground">{stat.hint}</p>}
        </div>
      ))}
    </div>
  )
}
