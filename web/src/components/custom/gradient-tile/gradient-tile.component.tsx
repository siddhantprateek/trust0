import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const tones = {
  sunset:
    'bg-[radial-gradient(at_0%_0%,#f6c56b_0%,transparent_35%),radial-gradient(at_20%_100%,#3b2fd6_0%,transparent_50%),radial-gradient(at_80%_20%,#e957c9_0%,transparent_55%),linear-gradient(135deg,#f08fd0,#b36cf0)]',
  ocean:
    'bg-[radial-gradient(at_0%_100%,#b77cf2_0%,transparent_45%),radial-gradient(at_60%_40%,#5a7bd8_0%,transparent_45%),radial-gradient(at_100%_100%,#0e3b33_0%,transparent_55%),linear-gradient(135deg,#0f4a42,#2d2a6e)]',
  orchid:
    'bg-[radial-gradient(at_0%_100%,#6d2ff0_0%,transparent_45%),radial-gradient(at_60%_50%,#f1dcf5_0%,transparent_45%),radial-gradient(at_100%_100%,#d13ee0_0%,transparent_55%),linear-gradient(135deg,#d58cf3,#c75be6)]',
} as const

export type GradientTone = keyof typeof tones

type GradientTileProps = {
  tone: GradientTone
  className?: string
  children?: ReactNode
}

export default function GradientTile({ tone, className, children }: GradientTileProps) {
  return (
    <div className={cn('grain overflow-hidden rounded-2xl', tones[tone], className)}>
      <div className="relative z-2 flex h-full items-center justify-center">{children}</div>
    </div>
  )
}
