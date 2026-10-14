// Adapted from Aceternity UI's Link Preview (https://ui.aceternity.com/components/link-preview): a hover card
// with a live screenshot of the linked site. Uses radix-ui's HoverCard and URLSearchParams instead of qss.
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react"
import { HoverCard as HoverCardPrimitive } from "radix-ui"
import * as React from "react"

import { cn } from "cn"
import { canScreenshot, screenshotUrl } from "@/lib/screenshot"

type LinkHoverPreviewProps = {
  children: React.ReactNode
  url: string
  className?: string
  width?: number
  height?: number
  // A known image (e.g. the page's own preview) instead of a screenshot
  imageSrc?: string | null
}

function LinkHoverPreview({ children, url, className, width = 200, height = 125, imageSrc }: LinkHoverPreviewProps) {
  const [isOpen, setOpen] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const src = imageSrc || (canScreenshot(url) ? screenshotUrl(url, width, height) : null)

  const x = useMotionValue(0)
  const translateX = useSpring(x, { stiffness: 100, damping: 15 })

  const handleMouseMove = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    x.set((event.clientX - rect.left - rect.width / 2) / 2) // halved to keep the follow subtle
  }

  if (!src || failed) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    )
  }

  return (
    <HoverCardPrimitive.Root openDelay={50} closeDelay={100} onOpenChange={setOpen}>
      <HoverCardPrimitive.Trigger asChild>
        <a href={url} target="_blank" rel="noopener noreferrer" onMouseMove={handleMouseMove} className={className}>
          {children}
        </a>
      </HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          className="z-50 [transform-origin:var(--radix-hover-card-content-transform-origin)]"
          side="top"
          align="center"
          sideOffset={10}
        >
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 20 } }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                className="rounded-xl shadow-xl"
                style={{ x: translateX }}
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border-2 border-transparent bg-popover p-1 shadow hover:border-border"
                  style={{ fontSize: 0 }}
                >
                  <img
                    src={src}
                    width={width}
                    height={height}
                    referrerPolicy="no-referrer"
                    onError={() => setFailed(true)}
                    className={cn("rounded-lg bg-muted object-cover")}
                    style={{ width, height }}
                    alt="Preview of the linked page"
                  />
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  )
}

export { LinkHoverPreview }
export type { LinkHoverPreviewProps }
