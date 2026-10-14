import { ExternalLink, FileText, Globe, ImageIcon, Maximize2, Play } from 'lucide-react'
import { motion } from 'motion/react'
import { HoverCard } from 'radix-ui'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { LinkPreview } from '@/components/ui/link-preview'
import { Skeleton } from '@/components/ui/skeleton'
import { useLinkPreview } from '@/hooks/use-link-preview'
import { apiUrl } from '@/lib/api'
import { formatDate, sourceLabel } from '@/lib/format'
import { canScreenshot, screenshotUrl } from '@/lib/screenshot'
import type { Report } from '@/lib/types'

const IMAGE_URL = /\.(jpe?g|png|gif|webp|avif)(\?|$)/i

type ContentPreviewProps = {
  report: Report
}

function formatDuration(seconds: number) {
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** What was checked: a link preview card whose thumbnail opens the media (or text) full size. */
export default function ContentPreview({ report }: ContentPreviewProps) {
  const preview = report.preview
  const [failedImages, setFailedImages] = useState<string[]>([])
  // The stored preview covers most reports; fetch the link's own metadata only when it is missing
  const needsLink = Boolean(report.url) && !(preview?.image || preview?.remoteImage) && report.source !== 'upload'
  const { data: link, loading } = useLinkPreview(needsLink ? report.url : null)

  if (!preview && !report.url) return null

  // Our own frame first: platform CDNs often refuse hotlinked thumbnails
  // Then the platform's thumbnail, the page's own image, the link itself when it is a picture, and last a live
  // screenshot of the page. Each one that fails to load falls through to the next.
  const directImage = report.url && IMAGE_URL.test(report.url) ? report.url : null
  const candidates = [
    preview?.image,
    preview?.remoteImage,
    link?.image,
    directImage,
    !loading && canScreenshot(report.url) && report.source !== 'upload' ? screenshotUrl(report.url) : null,
  ].filter((src): src is string => Boolean(src) && !failedImages.includes(src as string))
  const thumb = candidates[0] ?? null
  const fullMedia = preview?.mediaPath ? apiUrl(preview.mediaPath) : null
  const isVideo = (preview?.mediaType ?? preview?.kind) === 'video'
  const kind = isVideo ? 'video' : (preview?.mediaType ?? (link?.kind === 'image' || directImage ? 'image' : (preview?.kind ?? 'link')))
  const heading = preview?.title || link?.title || report.title
  const text = preview?.text || link?.description || ''
  const site = preview?.site || link?.siteName || ''
  const meta = [
    preview?.account,
    preview?.postedAt ? formatDate(preview.postedAt) : null,
    preview?.duration ? formatDuration(preview.duration) : null,
  ].filter(Boolean)

  const hoverMedia = fullMedia ?? directImage ?? thumb
  const thumbnail = (
    <HoverCard.Root openDelay={120} closeDelay={80}>
      <HoverCard.Trigger asChild>
        <DialogTrigger asChild>
          <button
            type="button"
            className="group relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:size-16"
            aria-label="Open preview"
          >
            {loading && !thumb ? (
              <Skeleton className="size-full" />
            ) : thumb ? (
              <img
                src={thumb}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => thumb && setFailedImages((failed) => [...failed, thumb])}
                className="size-full object-cover transition-transform group-hover:scale-105"
              />
            ) : kind === 'text' ? (
              <p className="line-clamp-3 p-1.5 text-left text-[9px] leading-tight text-muted-foreground">{text || report.title}</p>
            ) : (
              <PlaceholderIcon kind={kind} />
            )}
            {isVideo && thumb && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="rounded-full bg-black/60 p-1.5 text-white">
                  <Play className="size-3.5 fill-current" />
                </span>
              </span>
            )}
            <span className="absolute right-1 bottom-1 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Maximize2 className="size-3" />
            </span>
          </button>
        </DialogTrigger>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content side="right" align="start" sideOffset={12} collisionPadding={16} className="z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.85, x: -8 }}
            animate={{ opacity: 1, scale: 1, x: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } }}
            className="w-80 overflow-hidden rounded-xl bg-popover p-1 shadow-xl ring-1 ring-foreground/10"
          >
            {isVideo && fullMedia ? (
              <video src={fullMedia} poster={thumb ?? undefined} autoPlay muted loop playsInline className="max-h-80 w-full rounded-lg bg-black" />
            ) : hoverMedia ? (
              <img
                src={hoverMedia}
                alt={heading}
                referrerPolicy="no-referrer"
                className="max-h-80 w-full rounded-lg bg-muted object-contain"
              />
            ) : (
              <p className="max-h-60 overflow-hidden p-2 text-xs whitespace-pre-line text-muted-foreground">{text || heading}</p>
            )}
            <p className="px-1.5 pt-1.5 pb-0.5 text-[11px] text-muted-foreground">Click to open full size</p>
          </motion.div>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  )

  return (
    <Card size="sm">
      <CardContent>
        <Dialog>
          <LinkPreview
            url={report.url || '#'}
            title={heading}
            siteName={[site || sourceLabel(report), ...meta].join(' · ')}
            description={text && text !== heading ? text : undefined}
            media={thumbnail}
            className="gap-3 sm:gap-3 [&_h3]:line-clamp-1 [&_h3]:leading-5"
            onOpen={report.url ? undefined : () => {}}
          >
            {preview && preview.frames.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto">
                {preview.frames.map((frame, i) => (
                  <img key={i} src={frame} alt={`Keyframe ${i + 1}`} className="h-8 shrink-0 rounded-sm object-cover" />
                ))}
              </div>
            )}
          </LinkPreview>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="line-clamp-2 break-words">{heading}</DialogTitle>
              <DialogDescription>{[site, ...meta].filter(Boolean).join(' · ') || sourceLabel(report)}</DialogDescription>
            </DialogHeader>
            <FullView
              title={heading}
              text={text}
              linkedUrls={preview?.linkedUrls ?? []}
              url={report.url}
              site={site}
              thumb={thumb}
              fullMedia={fullMedia ?? directImage ?? (link?.kind === 'image' ? link.image : null)}
              isVideo={isVideo}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

function PlaceholderIcon({ kind }: { kind: string }) {
  const Icon = kind === 'link' ? Globe : kind === 'text' ? FileText : ImageIcon
  return <Icon className="size-8 text-muted-foreground" />
}

type FullViewProps = {
  title: string
  text: string
  linkedUrls: string[]
  url: string
  site: string
  thumb: string | null
  fullMedia: string | null
  isVideo: boolean
}

function FullView({ title, text, linkedUrls, url, site, thumb, fullMedia, isVideo }: FullViewProps) {
  const media =
    isVideo && fullMedia ? (
      <video src={fullMedia} poster={thumb ?? undefined} controls autoPlay className="max-h-[70dvh] w-full rounded-lg bg-black" />
    ) : fullMedia || thumb ? (
      <img
        src={fullMedia ?? thumb ?? undefined}
        alt={title}
        referrerPolicy="no-referrer"
        className="max-h-[70dvh] w-full rounded-lg bg-muted object-contain"
      />
    ) : null

  return (
    <div className="space-y-4">
      {media}
      {text && <div className="max-h-72 overflow-y-auto rounded-lg bg-muted p-3 text-sm whitespace-pre-line">{text}</div>}
      {linkedUrls.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Links in the post</p>
          {linkedUrls.map((linked) => (
            <a
              key={linked}
              href={linked}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 truncate text-xs text-primary hover:underline"
            >
              <ExternalLink className="size-3 shrink-0" />
              <span className="truncate">{linked}</span>
            </a>
          ))}
        </div>
      )}
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          Open original {site && `on ${site}`} <ExternalLink className="size-3.5" />
        </a>
      )}
    </div>
  )
}
