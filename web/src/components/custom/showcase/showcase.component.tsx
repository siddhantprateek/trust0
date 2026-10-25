import { useEffect, useRef, type RefObject } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import mockupBg from '@/assets/showcase-bg.webp'
import ReportMockup from '@/components/custom/report-mockup/report-mockup.component'
import { Button } from '@/components/ui/button'
import { site } from '@/config/site'
import { fadeUp, stagger } from '@/lib/motion'

type Note = {
  side: 'left' | 'right'
  target: string // the mockup element (data-annot) the pointer follows
  dx: number // how far in from that element's near edge the dot lands, in px
  fy?: number // how far down the element the dot lands, 0 to 1
  scrolls?: boolean // the element lives in the mockup's scrolling pane, so it hides when scrolled out of it
  title: string
  text: string
}

const notes: Note[] = [
  { side: 'left', target: 'nav', dx: 110, fy: 0.05, title: 'The studio', text: 'Overview, New check, Reports, Models, Playground.' },
  { side: 'left', target: 'post', dx: 70, scrolls: true, title: 'The post, as found', text: 'Author, platform, time. Media stays blurred.' },
  { side: 'left', target: 'score', dx: 70, scrolls: true, title: 'Score and AI odds', text: 'A 0 to 100 trust score beside t0-vision’s AI probability.' },
  { side: 'left', target: 'tabs', dx: 40, scrolls: true, title: 'Every check, itemised', text: 'Checks, Claims, Coverage, Spread path, with sources.' },
  { side: 'right', target: 'verdict', dx: 14, scrolls: true, title: 'Edit flag', text: 'Flags content altered after first posting.' },
  { side: 'right', target: 'overall', dx: 70, scrolls: true, title: 'Plain-language verdict', text: 'An overall read you can forward to whoever sent the link.' },
]

const LABEL_W = 144
const GAP = 12
const MIN_APART = 58

/**
 * Labels in the margins with a line to the thing they explain. The mockup's content scrolls and its tabs
 * change height, so nothing here is positioned by hand: every frame each pointer re-reads where its
 * element is, follows it, and hides when the element is scrolled out of the pane or would sit on a label.
 */
function Annotations({ wrapRef }: { wrapRef: RefObject<HTMLDivElement | null> }) {
  const els = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    let raf = 0
    let visible = false
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const w = wrap.getBoundingClientRect()
      const k = w.width / wrap.offsetWidth || 1 // undo the entrance animation's scale
      const pane = wrap.querySelector('.overflow-y-auto')?.getBoundingClientRect()
      const taken: Record<string, number[]> = { left: [], right: [] }
      notes.forEach((n, i) => {
        const el = els.current[i]
        const target = wrap.querySelector(`[data-annot="${n.target}"]`)
        if (!el) return
        let show = false
        if (target) {
          const b = target.getBoundingClientRect()
          const y = (b.top + b.height * (n.fy ?? 0.5) - w.top) / k
          const x = n.side === 'left' ? (b.left - w.left) / k + n.dx : (w.right - b.right) / k + n.dx
          const inPane = !n.scrolls || (pane && b.top + b.height * 0.5 > pane.top + 6 && b.bottom < pane.bottom + b.height * 0.5)
          show = !!inPane && taken[n.side].every((t) => Math.abs(t - y) >= MIN_APART)
          if (show) {
            taken[n.side].push(y)
            el.style.top = `${y}px`
            el.style.setProperty('--x', `${x}px`)
          }
        }
        el.style.opacity = show ? '1' : '0'
      })
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !visible) raf = requestAnimationFrame(tick)
      if (!e.isIntersecting) cancelAnimationFrame(raf)
      visible = e.isIntersecting
    })
    io.observe(wrap)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [wrapRef])

  return notes.map((note, i) => {
    const edge = note.side
    return (
      <div
        key={note.title}
        ref={(el) => {
          els.current[i] = el
        }}
        className="pointer-events-none absolute hidden w-0 opacity-0 transition-opacity duration-300 xl:block"
        style={{ [edge]: 0 }}
      >
        <span className="absolute h-0.5 -translate-y-1/2 rounded-full bg-primary" style={{ [edge]: -GAP, width: `calc(${GAP}px + var(--x))` }} />
        <span className="absolute size-2.5 -translate-y-1/2 rounded-full bg-primary ring-2 ring-white" style={{ [edge]: 'calc(var(--x) - 5px)' }} />
        <div
          className="absolute -translate-y-1/2 rounded-lg bg-white/95 px-3 py-2 text-neutral-900"
          style={{ [edge]: -GAP - LABEL_W, width: LABEL_W }}
        >
          <p className="text-xs font-semibold">{note.title}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-neutral-600">{note.text}</p>
        </div>
      </div>
    )
  })
}

export default function Showcase() {
  const stageRef = useRef<HTMLDivElement>(null)
  const mockupRef = useRef<HTMLDivElement>(null)
  // The photo drifts slower than the page, so the mockup seems to float in front of the hills
  const { scrollYProgress } = useScroll({ target: stageRef, offset: ['start end', 'end start'] })
  const bgY = useTransform(scrollYProgress, [0, 1], ['20%', '80%'])

  return (
    <section id="showcase" className="scroll-mt-20 pt-20 sm:pt-28">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          className="mx-auto flex max-w-xl flex-col items-center text-center"
        >
          <motion.span
            variants={fadeUp}
            className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"
          >
            New
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">
            Introducing trust0 reports
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-3 text-muted-foreground">
            One shareable page per link: where it came from, how it was likely made, and a plain-language verdict you
            can send to anyone who forwarded it to you.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-5">
            <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/85">
              <a href={`${site.studioUrl}reports/rpt_2c5dee32f01f`}>See it in the studio</a>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Square-cornered stage behind the mockup, as wide as the hero and header (88rem) */}
      <motion.div
        ref={stageRef}
        className="mx-auto mt-12 w-full max-w-[88rem] bg-muted bg-cover px-3 py-10 sm:px-10 sm:py-20 xl:px-5"
        style={{ backgroundImage: `url(${mockupBg})`, backgroundPositionX: 'center', backgroundPositionY: bgY }}
      >
        <motion.div
          initial={{ opacity: 0, y: 70, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          ref={mockupRef}
          className="relative mx-auto max-w-[76rem] xl:w-[calc(100%-19.5rem)] xl:max-w-none"
        >
          <ReportMockup />
          <Annotations wrapRef={mockupRef} />
        </motion.div>
      </motion.div>
    </section>
  )
}
