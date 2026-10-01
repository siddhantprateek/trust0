import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

type LogoProps = {
  className?: string
}

export default function Logo({ className }: LogoProps) {
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
