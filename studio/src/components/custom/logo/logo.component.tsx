import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

type LogoProps = {
  className?: string
  mark?: boolean
}

export default function Logo({ className, mark = false }: LogoProps) {
  if (mark) {
    return (
      <span className={cn('inline-flex items-center gap-2', className)}>
        <span className="flex w-8 shrink-0 items-center justify-center">
          <img src="/logo-light.png" alt="" className="h-6 w-auto group-data-[collapsible=icon]:h-4 dark:hidden" />
          <img src="/logo-dark.png" alt="" className="hidden h-6 w-auto group-data-[collapsible=icon]:h-4 dark:block" />
        </span>
        {/* Text drops out when the sidebar collapses to icons */}
        <span className="flex flex-col group-data-[collapsible=icon]:hidden">
          <span className="text-sm font-semibold">trust0</span>
          <span className="font-pixel text-xs text-muted-foreground">Studio</span>
        </span>
      </span>
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <ShieldCheck className="size-4" strokeWidth={2.25} />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold">trust0</span>
        <span className="font-pixel text-xs text-muted-foreground">Studio</span>
      </span>
    </span>
  )
}
