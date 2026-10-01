// import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

type LogoProps = {
  className?: string
}

export default function Logo({ className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-serif text-xl font-semibold', className)}>
      {/* <ShieldCheck className="size-5" strokeWidth={2.25} /> */}
      trust0
    </span>
  )
}
