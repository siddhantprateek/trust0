import { LinkPreview } from '@/components/ui/link-preview'
import { Skeleton } from '@/components/ui/skeleton'
import { useLinkPreview } from '@/hooks/use-link-preview'
import { canScreenshot, screenshotUrl } from '@/lib/screenshot'
import { cn } from '@/lib/utils'

type LinkCardProps = {
  url: string
  className?: string
}

/** A compact link preview that fetches the page's title and image itself. */
export default function LinkCard({ url, className }: LinkCardProps) {
  const { data, loading } = useLinkPreview(url)

  if (loading) {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <Skeleton className="size-12 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    )
  }

  return (
    <LinkPreview
      url={url}
      title={data?.title || url}
      siteName={data?.siteName}
      description={data?.description || undefined}
      imageSrc={data?.image || (canScreenshot(url) ? screenshotUrl(url, 160, 160) : null)}
      imageClassName="size-12 rounded-lg sm:size-12"
      className={cn('gap-3 rounded-xl border p-1.5 pr-4 sm:gap-3 [&_h3]:line-clamp-1 [&_h3]:leading-5', className)}
    />
  )
}
