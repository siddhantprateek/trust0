import { useCallback, useLayoutEffect, useState, type FocusEvent, type PointerEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'

export type ShowTip = (event: PointerEvent<Element> | FocusEvent<Element>, content: ReactNode) => void

type ChartFigureProps = {
  title: string
  caption?: ReactNode
  legend?: ReactNode
  controls?: ReactNode
  // Rendered with the measured width so the SVG draws at real pixel size (crisp text at every width)
  children: (args: { width: number; showTip: ShowTip; hideTip: () => void }) => ReactNode
  className?: string
}

type Tip = { x: number; y: number; content: ReactNode }

// Wraps a chart: title, legend, optional controls, caption, and a tooltip that follows the pointer
// (or sits above a focused mark when using the keyboard)
export default function ChartFigure({ title, caption, legend, controls, children, className }: ChartFigureProps) {
  const [el, setEl] = useState<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)
  const [tip, setTip] = useState<Tip | null>(null)

  useLayoutEffect(() => {
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [el])

  const showTip = useCallback<ShowTip>((event, content) => {
    const box = el?.getBoundingClientRect()
    if (!box) return
    if ('clientX' in event) {
      setTip({ x: event.clientX - box.left, y: event.clientY - box.top, content })
    } else {
      const mark = (event.target as Element).getBoundingClientRect()
      setTip({ x: mark.left + mark.width / 2 - box.left, y: mark.top - box.top, content })
    }
  }, [el])
  const hideTip = useCallback(() => setTip(null), [])

  return (
    <figure className={cn('not-prose my-10', className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {legend && <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">{legend}</div>}
        </div>
        {controls}
      </div>
      <div ref={setEl} className="relative mt-4" onPointerLeave={hideTip}>
        {width > 0 && children({ width, showTip, hideTip })}
        <AnimatePresence>
          {tip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.12 }}
              role="tooltip"
              className="pointer-events-none absolute z-10 w-max max-w-64 rounded-lg border bg-popover/95 px-3 py-2 text-xs text-popover-foreground shadow-lg backdrop-blur-sm"
              style={{
                left: Math.min(Math.max(tip.x, 90), Math.max(width - 90, 90)),
                top: tip.y - 12,
                translateX: '-50%',
                translateY: '-100%',
              }}
            >
              {tip.content}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {caption && <figcaption className="mt-3 text-[0.8rem] leading-relaxed text-muted-foreground">{caption}</figcaption>}
    </figure>
  )
}

export function LegendItem({ color, label, strong }: { color: string; label: string; strong?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', strong && 'font-semibold text-foreground')}>
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

export function TipRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        {color && <span className="size-2 rounded-full" style={{ background: color }} />}
        {label}
      </span>
      <span className="font-mono font-medium tabular-nums">{value}</span>
    </div>
  )
}
