import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Circle,
  EyeOff,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  LoaderCircle,
  Lock,
  PanelLeft,
  PlusCircle,
  Search,
  Settings,
} from 'lucide-react'
import postImage from '@/assets/sample-report-post-blur.webp'
import { sampleReport as r, type ClaimVerdict, type Lean } from '@/data/sample-report'
import { cn } from '@/lib/utils'

/**
 * A small, clickable replica of a trust0 studio report, built from a real report (data/sample-report.ts).
 *
 * When it scrolls into view it plays a scripted run: a cursor types the post's link into New check and
 * clicks Check, the seven pipeline stages tick through (their real durations are shown, the animation is
 * sped up), the report lands and the trust score counts up, then the cursor clicks through the report's
 * tabs. The moment the visitor's own pointer enters the window the fake cursor steps aside, and the first
 * click stops the tour. "New check" replays the run. Everything is local; nothing is fetched.
 */

const POST_URL = 'https://x.com/MeghUpdates/status/2110323480155590854'
const STEP_MS = 450
const TAB_MS = 7000
const TABS = ['Checks', 'Claims', 'Coverage', 'Spread path'] as const

const TONE = {
  good: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  warn: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  bad: 'bg-red-500/12 text-red-700 dark:text-red-300',
  neutral: 'bg-muted text-muted-foreground',
}

const CLAIM_TONE: Record<ClaimVerdict, keyof typeof TONE> = { supported: 'good', refuted: 'bad', mixed: 'warn', unverifiable: 'neutral' }

const LEAN: Record<Lean, { label: string; className: string; side: 'left' | 'center' | 'right' }> = {
  left: { label: 'Left', className: 'bg-blue-600/12 text-blue-700 dark:text-blue-300', side: 'left' },
  'lean-left': { label: 'Lean Left', className: 'bg-sky-500/12 text-sky-700 dark:text-sky-300', side: 'left' },
  center: { label: 'Center', className: 'bg-muted text-muted-foreground', side: 'center' },
  'lean-right': { label: 'Lean Right', className: 'bg-rose-500/12 text-rose-700 dark:text-rose-300', side: 'right' },
  right: { label: 'Right', className: 'bg-red-600/12 text-red-700 dark:text-red-300', side: 'right' },
}

const THIN_SCROLL =
  '[scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.14)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/10'

type Phase = 'idle' | 'typing' | 'checking' | 'done'

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Cards rise in one after another when a view lands
const rise = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay: 0.08 + i * 0.1, ease: [0.22, 1, 0.36, 1] as const },
})

function Pill({ tone, children }: { tone: keyof typeof TONE; children: ReactNode }) {
  return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap', TONE[tone])}>{children}</span>
}

function LeanPill({ lean }: { lean: Lean | null }) {
  if (!lean) return null
  return <span className={cn('rounded px-1.5 py-px text-[10px] font-medium', LEAN[lean].className)}>{LEAN[lean].label}</span>
}

function CheckRow({ ok, label, i }: { ok: boolean; label: string; i: number }) {
  return (
    <motion.li {...rise(i + 2)} className="flex items-start gap-2 text-xs leading-relaxed">
      {ok ? <CheckCircle2 className="mt-px size-3.5 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-px size-3.5 shrink-0 text-amber-600" />}
      <span>{label}</span>
    </motion.li>
  )
}

/** Counts from 0 to `target` once `run` turns true. */
function useCountUp(target: number, run: boolean, ms = 1000) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!run) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run, ms])
  return run ? value : 0
}

type CursorState = { x: number; y: number; show: boolean; click: number }

export default function ReportMockup({ className }: { className?: string }) {
  const [reduced] = useState(prefersReducedMotion)
  const [phase, setPhase] = useState<Phase>(reduced ? 'done' : 'idle')
  const [typed, setTyped] = useState(reduced ? POST_URL : '')
  const [pressed, setPressed] = useState(false)
  const [stepsDone, setStepsDone] = useState(reduced ? r.steps.length : 0)
  const [tab, setTab] = useState(0)
  const [autoTabs, setAutoTabs] = useState(!reduced)
  const [hovering, setHovering] = useState(false)
  const [leanFilter, setLeanFilter] = useState<'all' | 'left' | 'right'>('all')
  const [cursor, setCursor] = useState<CursorState>({ x: 0, y: 0, show: false, click: 0 })
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const checkBtnRef = useRef<HTMLButtonElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const score = useCountUp(r.trustScore, phase === 'done')

  /** Glide the fake cursor to the middle of an element (positions are relative to the mockup window). */
  const pointAt = useCallback((el: Element | null | undefined, click = false) => {
    const root = rootRef.current
    if (!root || !el) return
    const a = root.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    setCursor((c) => ({ x: b.left - a.left + b.width * 0.55, y: b.top - a.top + b.height * 0.6, show: true, click: c.click + (click ? 1 : 0) }))
  }, [])

  // Start the run once the mockup is on screen
  useEffect(() => {
    const el = rootRef.current
    if (!el || phase !== 'idle') return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setPhase('typing'), { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [phase])

  // New check: type the link, glide to Check, press it
  useEffect(() => {
    if (phase !== 'typing') return
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    at(0, () => {
      setTyped('')
      setPressed(false)
      const root = rootRef.current
      if (root) setCursor({ x: root.clientWidth * 0.78, y: root.clientHeight * 0.82, show: true, click: 0 })
    })
    const typingStart = 900
    const perChar = 24
    for (let i = 1; i <= POST_URL.length; i++) at(typingStart + i * perChar, () => setTyped(POST_URL.slice(0, i)))
    const typedAt = typingStart + POST_URL.length * perChar
    at(typedAt + 250, () => pointAt(checkBtnRef.current))
    at(typedAt + 1050, () => {
      pointAt(checkBtnRef.current, true)
      setPressed(true)
    })
    at(typedAt + 1350, () => {
      setStepsDone(0)
      setPhase('checking')
    })
    return () => timers.forEach(window.clearTimeout)
  }, [phase, pointAt])

  // Tick the pipeline stages, then land the report
  useEffect(() => {
    if (phase !== 'checking') return
    const id = window.setTimeout(
      () => {
        if (stepsDone < r.steps.length) return setStepsDone((n) => n + 1)
        setPhase('done')
        setCursor((c) => ({ ...c, show: false }))
      },
      stepsDone === 0 ? 500 : stepsDone < r.steps.length ? STEP_MS : 500,
    )
    return () => window.clearTimeout(id)
  }, [phase, stepsDone])

  useEffect(() => {
    if (phase === 'done') scrollRef.current?.scrollTo({ top: 0 })
  }, [phase])

  // Report tour: the active tab's underline fills; the cursor drifts to the next tab and clicks it. Paused
  // while the visitor's pointer is over the mockup, stopped for good once they click.
  useEffect(() => {
    const bar = barRef.current
    if (phase !== 'done' || !autoTabs) {
      if (bar) bar.style.transform = 'scaleX(1)'
      return
    }
    const next = (tab + 1) % TABS.length
    let raf = 0
    let last = performance.now()
    let elapsed = 0
    let stage = 0
    const loop = (now: number) => {
      if (!hovering && !document.hidden) elapsed += now - last
      last = now
      const p = Math.min(1, elapsed / TAB_MS)
      if (bar) bar.style.transform = `scaleX(${p})`
      if (p > 0.66 && stage < 1) {
        stage = 1
        pointAt(tabRefs.current[tab])
      }
      if (p > 0.8 && stage < 2) {
        stage = 2
        pointAt(tabRefs.current[next])
      }
      if (p >= 1) {
        pointAt(tabRefs.current[next], true)
        window.setTimeout(() => setTab(next), 160)
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phase, autoTabs, tab, hovering, pointAt])

  const takeOver = () => {
    setAutoTabs(false)
    setCursor((c) => ({ ...c, show: false }))
  }

  const replay = () => {
    takeOver()
    setPhase('typing')
    setTab(0)
  }

  const nav = [
    { label: 'Overview', icon: LayoutGrid },
    { label: 'New check', icon: PlusCircle, active: phase === 'typing' || phase === 'idle', onClick: replay },
    {
      label: 'Reports',
      icon: FileText,
      active: phase !== 'typing' && phase !== 'idle',
      onClick: () => {
        takeOver()
        setStepsDone(r.steps.length)
        setPhase('done')
      },
    },
    { label: 'Models', icon: Boxes },
    { label: 'Playground', icon: FlaskConical },
  ]

  const coverage = r.coverage.sources.filter((s) => leanFilter === 'all' || (s.lean && LEAN[s.lean].side === leanFilter))

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative w-full overflow-hidden rounded-xl border bg-background text-left text-foreground',
        className,
      )}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      onPointerDownCapture={() => autoTabs && phase === 'done' && takeOver()}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b bg-muted/60 px-4 py-2.5">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2.5 rounded-full bg-foreground/15" />
          ))}
        </div>
        <div className="mx-auto flex min-w-0 items-center gap-1.5 rounded-md bg-background px-3 py-1 text-[11px] text-muted-foreground">
          <Lock className="size-3 shrink-0" />
          <span className="truncate">studio.trytrust0.online/{phase === 'typing' || phase === 'idle' ? 'new' : `reports/${r.id}`}</span>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex h-[640px] sm:h-[700px]">
        {/* Sidebar */}
        <aside className="hidden w-52 shrink-0 flex-col border-r bg-muted/30 p-3 md:flex">
          <div className="flex items-center gap-1.5 px-1">
            <img src="/logo-light.webp" alt="" width={32} height={32} className="-ml-1 size-8 dark:hidden" />
            <img src="/logo-dark.webp" alt="" width={32} height={32} className="-ml-1 hidden size-8 dark:block" />
            <div className="leading-tight">
              <p className="text-sm font-semibold">trust0</p>
              <p className="text-[11px] text-muted-foreground">Studio</p>
            </div>
          </div>
          <p className="mt-6 px-2 text-[11px] text-muted-foreground">Workspace</p>
          <ul data-annot="nav" className="mt-1.5 space-y-0.5">
            {nav.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={item.onClick}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors duration-300',
                    item.active ? 'bg-foreground/[0.06] font-medium' : 'text-foreground/80 hover:bg-foreground/[0.04]',
                    !item.onClick && 'cursor-default',
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-6 px-2 text-[11px] text-muted-foreground">Account</p>
          <div className="mt-1.5 flex items-center gap-2 px-2 py-1.5 text-[13px] text-foreground/80">
            <Settings className="size-4" /> Settings
          </div>
          <div className="mt-auto flex items-center gap-2 px-1">
            <span className="grid size-7 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">D</span>
            <div className="min-w-0 leading-tight">
              <p className="text-xs font-medium">Demo</p>
              <p className="truncate text-[10px] text-muted-foreground">demo@trytrust0.online</p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Breadcrumb bar */}
          <div className="flex items-center gap-3 border-b px-4 py-2.5">
            <PanelLeft className="size-4 text-muted-foreground" />
            <span className="h-4 w-px bg-border" />
            <nav className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              Studio <ChevronRight className="size-3" /> {phase === 'typing' || phase === 'idle' ? 'New check' : 'Reports'}
              {phase !== 'typing' && phase !== 'idle' && (
                <>
                  <ChevronRight className="size-3" />
                  <span className="text-foreground">Report</span>
                </>
              )}
            </nav>
            <div data-annot="search" className="ml-auto hidden items-center gap-2 rounded-md border px-2.5 py-1 text-[11px] text-muted-foreground lg:flex">
              <Search className="size-3" /> Search reports, APIs, models
              <kbd className="rounded bg-muted px-1 font-mono text-[10px]">⌘K</kbd>
            </div>
          </div>

          <div ref={scrollRef} className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6', THIN_SCROLL)}>
            <AnimatePresence mode="wait" initial={false}>
              {phase === 'idle' || phase === 'typing' ? (
                <motion.div
                  key="new-check"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                  className="mx-auto max-w-xl pt-6 sm:pt-12"
                >
                  <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">New check</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">Paste a link, upload a photo or video, or drop in some text.</p>
                  <div className="mt-5 inline-flex rounded-lg border p-0.5 text-xs">
                    {['Link', 'Upload', 'Text'].map((t) => (
                      <span key={t} className={cn('rounded-md px-3 py-1 font-medium', t === 'Link' ? 'bg-foreground text-background' : 'text-muted-foreground')}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-lg border bg-background px-3 py-2.5 shadow-sm">
                    <Link2 className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {typed || <span className="text-muted-foreground">https://</span>}
                      {phase === 'typing' && <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-foreground" />}
                    </span>
                  </div>
                  <button
                    ref={checkBtnRef}
                    type="button"
                    onClick={replay}
                    className={cn(
                      'mt-3 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-transform duration-150',
                      pressed && 'scale-95',
                    )}
                  >
                    Check
                  </button>
                  <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                    trust0 traces where it came from, runs AI detection, fact-checks the claims and compares how outlets across the spectrum cover it.
                  </p>
                </motion.div>
              ) : (
                <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  {/* Title */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-base font-semibold tracking-tight sm:text-lg">{r.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.source} · checked {r.checkedAt}
                      </p>
                    </div>
                    {phase === 'done' ? (
                      <motion.span data-annot="verdict" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.1 }}>
                        <Pill tone={r.verdict.tone}>{r.verdict.label}</Pill>
                      </motion.span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        <LoaderCircle className="size-3 animate-spin" /> Checking
                      </span>
                    )}
                  </div>

                  {/* The post */}
                  <motion.div data-annot="post" {...rise(0)} className="mt-4 flex gap-3 rounded-xl border p-3">
                    <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md sm:w-32">
                      <img src={postImage} alt="Blurred post image" className="size-full object-cover" />
                      <span className="absolute inset-0 grid place-items-center">
                        <span className="inline-flex items-center gap-1 rounded bg-black/45 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm">
                          <EyeOff className="size-2.5" /> Sensitive
                        </span>
                      </span>
                    </div>
                    <div className="min-w-0 text-xs">
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">{r.post.account}</span> · {r.post.site} · {r.post.postedAt}
                      </p>
                      <p className="mt-1 line-clamp-3 leading-relaxed text-foreground/80">{r.post.text}</p>
                    </div>
                  </motion.div>

                  {phase !== 'done' ? (
                    <motion.div {...rise(1)} className="mt-4 rounded-xl border p-4">
                      <p className="text-sm font-medium">How this is being checked</p>
                      <ol className="mt-3 space-y-2.5">
                        {r.steps.map((s, i) => {
                          const done = i < stepsDone
                          const running = phase === 'checking' && i === stepsDone
                          return (
                            <li key={s.label} className="flex items-start gap-2.5 text-xs">
                              {done ? (
                                <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 16 }}>
                                  <CheckCircle2 className="mt-px size-4 shrink-0 text-emerald-600" />
                                </motion.span>
                              ) : running ? (
                                <LoaderCircle className="mt-px size-4 shrink-0 animate-spin text-primary" />
                              ) : (
                                <Circle className="mt-px size-4 shrink-0 text-muted-foreground/40" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className={cn('transition-colors', done || running ? 'text-foreground' : 'text-muted-foreground')}>{s.label}</p>
                                {done && (
                                  <motion.p initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} className="text-muted-foreground">
                                    {s.detail}
                                  </motion.p>
                                )}
                              </div>
                              {done && <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{s.seconds}s</span>}
                            </li>
                          )
                        })}
                      </ol>
                    </motion.div>
                  ) : (
                    <div>
                      {/* Headline numbers */}
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <motion.div data-annot="score" {...rise(0)} className="rounded-xl border p-4">
                          <p className="text-xs text-muted-foreground">Trust score</p>
                          <p className="mt-1 font-mono text-4xl font-medium tabular-nums">{score}</p>
                          <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${r.trustScore}%` }}
                              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                              className="h-full rounded-full bg-primary"
                            />
                          </div>
                          <p className="mt-2 text-[10px] leading-snug text-muted-foreground">0 means almost certainly untrustworthy, 100 means strong evidence it’s authentic.</p>
                        </motion.div>
                        <motion.div {...rise(1)} className="rounded-xl border p-4">
                          <p className="text-xs text-muted-foreground">AI-generated probability</p>
                          <p className="mt-1 font-mono text-4xl font-medium tabular-nums">{Math.round(r.aiProbability * 100)}%</p>
                          <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: '2%' }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                              className="h-full rounded-full bg-primary"
                            />
                          </div>
                          <p className="mt-2 text-[10px] text-muted-foreground">t0-vision {(r.aiProbability * 100).toFixed(1)}%</p>
                        </motion.div>
                        <motion.div data-annot="overall" {...rise(2)} className="rounded-xl border p-4">
                          <p className="text-xs font-medium">Overall</p>
                          <p className="mt-1.5 line-clamp-6 text-[11px] leading-relaxed text-foreground/80">{r.summary}</p>
                        </motion.div>
                      </div>

                      {/* Tabs */}
                      <div role="tablist" data-annot="tabs" className="mt-5 flex gap-1 overflow-x-auto border-b [scrollbar-width:none]">
                        {TABS.map((label, i) => {
                          const count = [null, r.claims.length, r.coverage.total, r.spread.length][i]
                          return (
                            <button
                              key={label}
                              ref={(el) => {
                                tabRefs.current[i] = el
                              }}
                              type="button"
                              role="tab"
                              aria-selected={tab === i}
                              onClick={() => {
                                takeOver()
                                setTab(i)
                              }}
                              className={cn(
                                'relative shrink-0 px-3 pt-1 pb-2.5 text-xs font-medium transition-colors',
                                tab === i ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                              )}
                            >
                              {label}
                              {count !== null && <span className="ml-1.5 text-muted-foreground tabular-nums">{count}</span>}
                              {tab === i && (
                                <span
                                  key={`bar-${tab}`}
                                  ref={barRef}
                                  className="absolute inset-x-0 -bottom-px h-0.5 origin-left bg-foreground"
                                  style={{ transform: autoTabs ? 'scaleX(0)' : 'scaleX(1)' }}
                                />
                              )}
                            </button>
                          )
                        })}
                      </div>

                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={tab}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, transition: { duration: 0.12 } }}
                          transition={{ duration: 0.25 }}
                          className="pt-4"
                        >
                          {tab === 0 && (
                            <div className="grid gap-3 lg:grid-cols-2">
                              {r.sections.map((s, si) => (
                                <motion.div key={s.title} {...rise(si)} className="rounded-xl border p-4">
                                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    {s.kind === 'text' ? <FileText className="size-3.5" /> : <ImageIcon className="size-3.5" />}
                                    {s.title}
                                  </p>
                                  <div className="mt-1 flex items-center gap-2">
                                    <span className="font-mono text-2xl font-medium tabular-nums">{s.score}</span>
                                    <Pill tone={s.verdict.tone}>{s.verdict.label}</Pill>
                                  </div>
                                  <ul className="mt-3 space-y-2">
                                    {s.checks.map((c, ci) => (
                                      <CheckRow key={c.label} {...c} i={ci} />
                                    ))}
                                  </ul>
                                </motion.div>
                              ))}
                            </div>
                          )}

                          {tab === 1 && (
                            <ul className="divide-y rounded-xl border">
                              {r.claims.map((c, i) => (
                                <motion.li key={c.text} {...rise(i)} className="p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="text-xs font-medium leading-relaxed">{c.text}</p>
                                    <Pill tone={CLAIM_TONE[c.verdict]}>{c.verdict}</Pill>
                                  </div>
                                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{c.explanation}</p>
                                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                                    {c.sources.map((src) => (
                                      <span key={src.publisher} className="inline-flex items-center gap-1 text-[11px] text-primary">
                                        {src.publisher}
                                        <LeanPill lean={src.lean} />
                                      </span>
                                    ))}
                                  </div>
                                </motion.li>
                              ))}
                            </ul>
                          )}

                          {tab === 2 && (
                            <div className="rounded-xl border p-4">
                              <p className="text-[11px] text-muted-foreground">
                                {r.coverage.total} outlets covering this story · searched for “{r.coverage.query}”. Lean is rated per outlet, never per fact.
                              </p>
                              <div className="mt-3 flex h-7 overflow-hidden rounded-md text-[11px] font-semibold text-white">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${r.coverage.leftPct}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="grid place-items-center overflow-hidden bg-blue-600 whitespace-nowrap">
                                  Left {r.coverage.leftPct}%
                                </motion.div>
                                <motion.div initial={{ width: 0 }} animate={{ width: `${r.coverage.rightPct}%` }} transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="grid place-items-center overflow-hidden bg-red-600 whitespace-nowrap">
                                  Right {r.coverage.rightPct}%
                                </motion.div>
                              </div>
                              <p className="mt-1.5 text-[10px] text-muted-foreground">
                                {r.coverage.left} left · {r.coverage.center} center · {r.coverage.right} right · {r.coverage.unrated} unrated
                              </p>
                              <div className="mt-3 flex gap-1 text-[11px]">
                                {(
                                  [
                                    ['all', `All ${r.coverage.total}`],
                                    ['left', `Left ${r.coverage.left}`],
                                    ['right', `Right ${r.coverage.right}`],
                                  ] as const
                                ).map(([key, label]) => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => setLeanFilter(key)}
                                    className={cn('rounded-md px-2 py-1 font-medium', leanFilter === key ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                              <ul className="mt-2 divide-y">
                                {coverage.map((s, i) => (
                                  <motion.li key={s.outlet} {...rise(Math.min(i, 5) * 0.6)} className="py-2">
                                    <p className="flex items-center gap-1.5 text-xs">
                                      <span className="font-medium">{s.outlet}</span>
                                      {s.lean && (
                                        <span className={cn('rounded px-1.5 py-px text-[10px] font-medium', LEAN[s.lean].className)}>{LEAN[s.lean].label} · est.</span>
                                      )}
                                      <span className="text-[10px] text-muted-foreground">{s.date}</span>
                                    </p>
                                    <p className="mt-0.5 truncate text-[11px] text-foreground/75">{s.title}</p>
                                  </motion.li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {tab === 3 && (
                            <div className="rounded-xl border p-4">
                              <p className="text-xs font-medium">Where this content first appeared, and how it spread</p>
                              <ol className="relative mt-3 space-y-4 border-l pl-5">
                                {r.spread.map((s, i) => (
                                  <motion.li
                                    key={`${s.account}-${i}`}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + i * 0.28, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                    className="relative text-xs"
                                  >
                                    <motion.span
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ delay: 0.1 + i * 0.28, type: 'spring', stiffness: 420, damping: 16 }}
                                      className={cn('absolute top-1 -left-[1.6rem] size-2.5 rounded-full ring-4 ring-background', s.origin ? 'bg-primary' : 'bg-muted-foreground/45')}
                                    />
                                    <p className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-medium">{s.account}</span>
                                      <span className="text-muted-foreground">
                                        on {s.platform} · {s.when}
                                      </span>
                                      {s.origin && <span className="rounded-full bg-primary/12 px-1.5 py-px text-[10px] font-medium text-primary">Origin</span>}
                                      <span className="rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground">{s.evidence}</span>
                                    </p>
                                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{s.note}</p>
                                  </motion.li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* The scripted cursor: it steps aside the moment the visitor's own pointer is over the window */}
      {!reduced && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 z-20"
          initial={false}
          animate={{ x: cursor.x, y: cursor.y, opacity: cursor.show && !hovering ? 1 : 0 }}
          transition={{ x: { duration: 0.75, ease: [0.22, 1, 0.36, 1] }, y: { duration: 0.75, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.25 } }}
        >
          <motion.span
            key={cursor.click}
            initial={{ scale: 0, opacity: cursor.click ? 0.45 : 0 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 0.55 }}
            className="absolute -top-4 -left-4 size-8 rounded-full bg-primary"
          />
          <svg width="22" height="22" viewBox="0 0 22 22" className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]">
            <path d="M3 2 L3 17 L7.2 13.2 L10 19.5 L12.4 18.4 L9.7 12.3 L15.5 12 Z" fill="#1a1a1a" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </motion.div>
      )}
    </div>
  )
}
