import { cn } from '@/lib/utils'

type LogoProps = {
  className?: string
  // White mark for dark backgrounds (e.g. over the hero image), whatever the theme
  inverted?: boolean
}

// The PNGs have built-in padding around the mark, so the image box is larger than the mark itself
export default function Logo({ className, inverted = false }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 font-serif text-xl font-semibold', className)}>
      <span className="-ml-2 flex size-9 shrink-0 items-center justify-center">
        <img
          src="/logo-light.webp"
          alt=""
          width={36}
          height={36}
          className={cn('size-9 transition-opacity duration-300', inverted ? 'hidden' : 'dark:hidden')}
        />
        <img
          src="/logo-dark.webp"
          alt=""
          width={36}
          height={36}
          className={cn('size-9 transition-opacity duration-300', inverted ? 'block' : 'hidden dark:block')}
        />
      </span>
      trust0
    </span>
  )
}
