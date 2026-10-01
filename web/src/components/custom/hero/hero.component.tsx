import { motion } from 'motion/react'
import { ArrowRight, Check, Link2 } from 'lucide-react'
import heroImage from '@/assets/hero.jpg'
import { Button } from '@/components/ui/button'
import { ease, fadeUp, stagger } from '@/lib/motion'

const sources = ['Instagram', 'X', 'YouTube', 'TikTok', 'Reddit', 'News articles']

const analysisSteps = [
  { label: 'Source traced', detail: '3 reposts back to original' },
  { label: 'First posted', detail: '@originalaccount · 2 days ago' },
  { label: 'Generation signals', detail: 'Likely AI-generated · 87%' },
]

function HeroBackground() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-[#1c2a14]">
      {/* Slow push-in on the image */}
      <motion.img
        src={heroImage}
        alt=""
        className="size-full object-cover object-center"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* Darken bottom-left behind the copy, and the top edge behind the header */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_70%_at_10%_90%,rgb(0_0_0/0.6),transparent_70%)]" />
      <div className="absolute inset-x-0 top-0 h-36 bg-linear-to-b from-black/35 to-transparent" />
    </div>
  )
}

function AnalysisCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...ease, delay: 0.5 }}
      className="w-full max-w-sm"
    >
      <div className="rounded-xl bg-white/90 p-5 text-neutral-900 backdrop-blur-xl">
        <div className="flex items-center gap-2 rounded-md bg-neutral-100 px-3 py-2 font-mono text-xs text-neutral-600">
          <Link2 className="size-3.5 shrink-0" />
          <span className="truncate">instagram.com/reel/C9x…</span>
        </div>

        <ul className="mt-4 space-y-3">
          {analysisSteps.map((step, i) => (
            <motion.li
              key={step.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...ease, delay: 0.9 + i * 0.35 }}
              className="flex items-start gap-3"
            >
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                <Check className="size-3" strokeWidth={3} />
              </span>
              <div className="text-sm">
                <p className="font-medium">{step.label}</p>
                <p className="text-neutral-500">{step.detail}</p>
              </div>
            </motion.li>
          ))}
        </ul>

        <div className="mt-5">
          <div className="flex justify-between text-xs text-neutral-500">
            <span>Trust score</span>
            <span className="font-mono">18 / 100</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-200">
            <motion.div
              className="h-full rounded-full bg-linear-to-r from-[#e54b4f] to-[#fd822b]"
              initial={{ width: 0 }}
              animate={{ width: '18%' }}
              transition={{ duration: 0.9, delay: 2, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-white">Sample analysis</p>
    </motion.div>
  )
}

export default function Hero() {
  return (
    <section>
      <div id="hero" className="relative flex min-h-[clamp(34rem,calc(100svh-7.5rem),56rem)] items-end overflow-hidden">
        <HeroBackground />

        <div className="relative z-2 mx-auto grid w-full max-w-[88rem] gap-10 px-4 pt-28 pb-12 lg:grid-cols-[1fr_auto] lg:items-end">
          <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl text-white">
            <motion.p variants={fadeUp} className="text-xs font-semibold tracking-wider uppercase text-white/75">
              Content provenance · AI detection
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mt-4 font-serif text-5xl leading-[1.02] font-medium tracking-tighter sm:text-6xl lg:text-6xl"
            >
              The trust layer for <br /> everything you see online.
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-[44rem] text-base text-pretty text-white/85 sm:text-lg">
              Paste a video, photo, post or article. trust0 traces where it came from, shows how it was made, and
              flags the AI that&rsquo;s confidently wrong about it.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-2">
              <Button size="lg" asChild>
                <a href="#showcase">
                  Verify a link <ArrowRight data-icon="inline-end" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white/35 bg-white/5 text-white hover:bg-white/15 hover:text-white dark:border-white/35 dark:bg-white/5 dark:hover:bg-white/15"
              >
                <a href="#features">See how it works</a>
              </Button>
            </motion.div>
          </motion.div>

          <AnalysisCard />
        </div>
      </div>

      <div className="mx-auto flex max-w-[88rem] flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:gap-12">
        <p className="shrink-0 text-sm text-muted-foreground md:max-w-48">Paste links from wherever content spreads</p>
        <ul className="flex flex-wrap items-center gap-x-10 gap-y-3">
          {sources.map((source) => (
            <li key={source} className="text-xl font-bold tracking-tight text-foreground/70">
              {source}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
