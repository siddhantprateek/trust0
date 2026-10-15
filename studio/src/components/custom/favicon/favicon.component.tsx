import { Globe } from 'lucide-react'
import { useState } from 'react'
import { faviconUrl } from '@/lib/favicon'
import { cn } from '@/lib/utils'

type FaviconProps = {
  domain: string | null | undefined
  size?: number
  className?: string
}

/** An outlet's favicon, falling back to a generic globe icon when the domain is missing or the icon fails to load. */
export default function Favicon({ domain, size = 16, className }: FaviconProps) {
  const [failed, setFailed] = useState(false)

  if (!domain || failed) {
    return <Globe aria-hidden className={cn('shrink-0 text-muted-foreground', className)} style={{ width: size, height: size }} />
  }

  return (
    <img
      src={faviconUrl(domain, size * 2)}
      alt=""
      aria-hidden
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn('shrink-0 rounded-[3px]', className)}
      style={{ width: size, height: size }}
    />
  )
}
