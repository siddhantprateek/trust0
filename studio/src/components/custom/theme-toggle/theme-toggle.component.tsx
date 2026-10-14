import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ThemeToggleProps = {
  className?: string
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  // next-themes reads the stored/system preference synchronously on first render (this is a client-only
  // SPA, so there's no server-rendered markup to mismatch), so resolvedTheme is accurate from the start.
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('relative', className)}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <Sun className={cn('size-4 scale-100 rotate-0 transition-all duration-300 ease-out', isDark && 'scale-0 -rotate-90')} />
      <Moon
        className={cn('absolute size-4 scale-0 rotate-90 transition-all duration-300 ease-out', isDark && 'scale-100 rotate-0')}
      />
    </Button>
  )
}
