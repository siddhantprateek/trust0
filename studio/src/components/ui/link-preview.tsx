// Adapted from Pasta UI's Link Preview (https://pastaui.com/docs/component/link-preview), with lucide icons,
// a `media` slot to replace the image box, and children rendered under the text.
import { Globe, Star } from "lucide-react"
import * as React from "react"

import { cn } from "cn"
import { LinkHoverPreview } from "@/components/ui/link-hover-preview"
import { faviconUrl } from "@/lib/favicon"

interface LinkPreviewProps extends React.ComponentProps<"article"> {
  description?: string
  imageSrc?: string | null
  imageClassName?: string
  media?: React.ReactNode
  price?: string
  seller?: string
  rating?: number
  reviewCount?: string
  onOpen?: () => void
  siteName?: string
  title: string
  url: string
}

function LinkPreview({
  className,
  children,
  description,
  imageSrc,
  imageClassName,
  media,
  price,
  seller,
  rating,
  reviewCount,
  onOpen,
  siteName,
  title,
  url,
  ...props
}: LinkPreviewProps) {
  const [imageLoaded, setImageLoaded] = React.useState(false)
  const [imageFailed, setImageFailed] = React.useState(false)
  const [faviconFailed, setFaviconFailed] = React.useState(false)
  let hostname: string
  try {
    hostname = new URL(url).hostname.replace("www.", "")
  } catch {
    hostname = url
  }

  return (
    <article
      data-slot="link-preview"
      className={cn(
        "flex items-center gap-4 rounded-[16px] font-sans text-sm leading-5 font-[450] tracking-[-0.05px] text-muted-foreground sm:gap-6",
        className
      )}
      {...props}
    >
      {media ?? (
        <div
          className={cn(
            "flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-muted sm:size-40",
            imageClassName
          )}
        >
          {imageSrc && !imageFailed ? (
            <img
              alt=""
              className={cn(
                "size-full object-cover transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                !imageLoaded && "opacity-0"
              )}
              height={160}
              loading="lazy"
              referrerPolicy="no-referrer"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
              ref={(image) => {
                if (image?.complete && image.naturalWidth) setImageLoaded(true)
              }}
              src={imageSrc}
              width={160}
            />
          ) : (
            <Globe className="size-6 text-muted-foreground" />
          )}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="line-clamp-2 leading-6 font-medium break-words text-foreground">
          {onOpen ? (
            <a
              href={url}
              className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              onClick={(event) => {
                event.preventDefault()
                onOpen()
              }}
            >
              {title}
            </a>
          ) : (
            <LinkHoverPreview
              url={url}
              className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {title}
            </LinkHoverPreview>
          )}
        </h3>
        <p className="flex items-center gap-1.5 truncate text-muted-foreground">
          {!faviconFailed && (
            <img
              alt=""
              aria-hidden="true"
              className="size-3.5 shrink-0 rounded-[3px]"
              height={14}
              onError={() => setFaviconFailed(true)}
              referrerPolicy="no-referrer"
              src={faviconUrl(hostname, 32)}
              width={14}
            />
          )}
          {price && (
            <>
              <span className="tabular-nums">{price}</span>
              <span aria-hidden="true"> · </span>
            </>
          )}
          <span className="truncate">
            {siteName || hostname}
            {seller && ` – ${seller}`}
          </span>
        </p>
        {rating !== undefined && (
          <p
            className="flex items-center gap-2 text-muted-foreground"
            aria-label={`${rating} out of 5 stars${reviewCount ? `, ${reviewCount} reviews` : ""}`}
          >
            <Star aria-hidden="true" className="size-4 shrink-0 fill-current" />
            <span>
              {rating.toFixed(1)}
              {reviewCount && ` (${reviewCount})`}
            </span>
          </p>
        )}
        {description && <p className="line-clamp-1 text-xs leading-5 text-muted-foreground">{description}</p>}
        {children}
      </div>
    </article>
  )
}

export { LinkPreview }
export type { LinkPreviewProps }
